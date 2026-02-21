#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { join, resolve, extname, relative } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");
const zaphnathRoot = resolve(__dirname, "..");
const siblingRoot = resolve(zaphnathRoot, "..");

const repoRoots = [
  { name: "zaphnath", path: zaphnathRoot },
  { name: "zbrs-official", path: join(siblingRoot, "zbrs-official") },
  { name: "zbrs-registry", path: join(siblingRoot, "zbrs-registry") },
];

const textExtensions = new Set([".md", ".js", ".ts", ".sh", ".ps1"]);
const skipDirs = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "out",
  ".next",
  ".turbo",
  ".cache",
]);

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
  };
}

function compareVersions(a, b) {
  if (a.major !== b.major) {
    return a.major - b.major;
  }

  return a.minor - b.minor;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ensureValidVersion(version) {
  if (!/^\d+\.\d+$/.test(version)) {
    throw new Error(`Invalid ZBRS version "${version}". Expected format: <major>.<minor> (example: 1.1).`);
  }
}

function walkFiles(rootPath) {
  const out = [];

  function walk(currentPath) {
    for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) {
          walk(join(currentPath, entry.name));
        }
        continue;
      }

      if (entry.isFile()) {
        out.push(join(currentPath, entry.name));
      }
    }
  }

  walk(rootPath);
  return out;
}

function readJson(filePath) {
  const raw = readFileSync(filePath, "utf8");
  const content = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return JSON.parse(content);
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function collectCurrentVersions(files) {
  const versions = new Set();

  for (const filePath of files) {
    if (extname(filePath) !== ".json") {
      continue;
    }

    try {
      const json = readJson(filePath);

      if (json && typeof json === "object" && typeof json.zbrs_version === "string") {
        versions.add(json.zbrs_version);
      }

      if (
        filePath.endsWith("manifest.schema.json") &&
        json &&
        typeof json.$id === "string"
      ) {
        const match = json.$id.match(/\/zbrs\/v(\d+\.\d+)\/manifest\.json$/);
        if (match) {
          versions.add(match[1]);
        }
      }
    } catch {
      // Ignore invalid/non-JSON files.
    }
  }

  return versions;
}

function replaceVersionedText(content, oldVersions, targetVersion) {
  let next = content;

  for (const oldVersion of oldVersions) {
    const oldEscaped = escapeRegex(oldVersion);

    next = next.replace(
      new RegExp(`("zbrs_version"\\s*:\\s*")${oldEscaped}(")`, "g"),
      `$1${targetVersion}$2`
    );

    next = next.replace(
      new RegExp(`(zbrs_version\\s*:\\s*")${oldEscaped}(")`, "g"),
      `$1${targetVersion}$2`
    );

    next = next.replace(
      new RegExp(`(zbrs_version\\s*:\\s*')${oldEscaped}(')`, "g"),
      `$1${targetVersion}$2`
    );

    next = next.replace(
      new RegExp(`(\\\`zbrs_version\\\`\\s+is\\s+\\")${oldEscaped}(")`, "g"),
      `$1${targetVersion}$2`
    );

    next = next.replace(
      new RegExp(`(ZBRS\\s+v)${oldEscaped}`, "g"),
      `$1${targetVersion}`
    );

    next = next.replace(
      new RegExp(`(\\*\\*Version\\*\\*:\\s*)${oldEscaped}`, "g"),
      `$1${targetVersion}`
    );

    next = next.replace(
      new RegExp(`(\\/zbrs\\/v)${oldEscaped}(\\/manifest\\.json)`, "g"),
      `$1${targetVersion}$2`
    );
  }

  return next;
}

function replaceVersionedJsonStrings(value, oldVersions, targetVersion) {
  if (typeof value === "string") {
    return replaceVersionedText(value, oldVersions, targetVersion);
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceVersionedJsonStrings(item, oldVersions, targetVersion));
  }

  if (value && typeof value === "object") {
    const next = {};
    for (const [key, child] of Object.entries(value)) {
      next[key] = replaceVersionedJsonStrings(child, oldVersions, targetVersion);
    }
    return next;
  }

  return value;
}

function isVersionedStandardDoc(repoName, relativePath) {
  return (
    repoName === "zaphnath" &&
    /^docs\/standards\/zbrs-v\d+\.\d+\.md$/.test(relativePath)
  );
}

function ensureVersionedStandardDoc(targetVersion, dryRun, updatedFiles) {
  const standardsDir = join(zaphnathRoot, "docs", "standards");
  if (!existsSync(standardsDir) || !statSync(standardsDir).isDirectory()) {
    return;
  }

  const targetName = `zbrs-v${targetVersion}.md`;
  const targetPath = join(standardsDir, targetName);
  if (existsSync(targetPath)) {
    return;
  }

  const candidates = readdirSync(standardsDir)
    .map((name) => {
      const match = /^zbrs-v(\d+\.\d+)\.md$/.exec(name);
      if (!match) {
        return null;
      }

      const parsed = parseVersion(match[1]);
      if (!parsed) {
        return null;
      }

      return {
        name,
        version: match[1],
        parsed,
        path: join(standardsDir, name),
      };
    })
    .filter(Boolean);

  if (candidates.length === 0) {
    return;
  }

  candidates.sort((a, b) => compareVersions(a.parsed, b.parsed));
  const source = candidates[candidates.length - 1];
  const sourceContent = readFileSync(source.path, "utf8");
  const targetContent = replaceVersionedText(sourceContent, [source.version], targetVersion);

  updatedFiles.push(`zaphnath/docs/standards/${targetName}`);
  if (!dryRun) {
    writeFileSync(targetPath, targetContent, "utf8");
  }
}

function show() {
  let hasAny = false;

  for (const repo of repoRoots) {
    if (!existsSync(repo.path) || !statSync(repo.path).isDirectory()) {
      console.log(`- ${repo.name}: not found (${repo.path})`);
      continue;
    }

    const files = walkFiles(repo.path);
    const versions = [...collectCurrentVersions(files)].sort();

    if (versions.length > 0) {
      hasAny = true;
    }

    console.log(`- ${repo.name}: ${versions.length ? versions.join(", ") : "no zbrs_version found"}`);
  }

  if (!hasAny) {
    process.exitCode = 1;
  }
}

function setVersion(targetVersion, dryRun = false) {
  ensureValidVersion(targetVersion);

  const updatedFiles = [];
  ensureVersionedStandardDoc(targetVersion, dryRun, updatedFiles);

  for (const repo of repoRoots) {
    if (!existsSync(repo.path) || !statSync(repo.path).isDirectory()) {
      console.warn(`Skipping missing repo: ${repo.path}`);
      continue;
    }

    const files = walkFiles(repo.path);
    const oldVersions = [...collectCurrentVersions(files)].filter(
      (version) => version !== targetVersion
    );

    for (const filePath of files) {
      const extension = extname(filePath);
      const rel = relative(repo.path, filePath).replace(/\\/g, "/");

      if (isVersionedStandardDoc(repo.name, rel)) {
        continue;
      }

      if (extension === ".json") {
        let json;
        try {
          json = readJson(filePath);
        } catch {
          continue;
        }

        let changed = false;
        const originalJsonString = JSON.stringify(json);

        if (json && typeof json === "object" && typeof json.zbrs_version === "string" && json.zbrs_version !== targetVersion) {
          json.zbrs_version = targetVersion;
          changed = true;
        }

        if (
          filePath.endsWith("manifest.schema.json") &&
          json &&
          typeof json.$id === "string"
        ) {
          const nextId = json.$id.replace(
            /\/zbrs\/v\d+\.\d+\/manifest\.json$/,
            `/zbrs/v${targetVersion}/manifest.json`
          );
          if (nextId !== json.$id) {
            json.$id = nextId;
            changed = true;
          }
        }

        if (oldVersions.length > 0) {
          const replacedJson = replaceVersionedJsonStrings(json, oldVersions, targetVersion);
          if (JSON.stringify(replacedJson) !== originalJsonString) {
            json = replacedJson;
            changed = true;
          }
        }

        if (changed) {
          updatedFiles.push(`${repo.name}/${rel}`);
          if (!dryRun) {
            writeJson(filePath, json);
          }
        }

        continue;
      }

      if (!textExtensions.has(extension) || oldVersions.length === 0) {
        continue;
      }

      const original = readFileSync(filePath, "utf8");
      const next = replaceVersionedText(original, oldVersions, targetVersion);

      if (next !== original) {
        updatedFiles.push(`${repo.name}/${rel}`);
        if (!dryRun) {
          writeFileSync(filePath, next, "utf8");
        }
      }
    }
  }

  if (updatedFiles.length === 0) {
    console.log(`No files changed. Everything is already at ZBRS ${targetVersion}.`);
    return;
  }

  console.log(`${dryRun ? "[dry-run] " : ""}Updated ${updatedFiles.length} file(s) to ZBRS ${targetVersion}:`);
  for (const file of updatedFiles) {
    console.log(`  - ${file}`);
  }
}

function main() {
  const [command, arg, ...rest] = process.argv.slice(2);
  const dryRun = rest.includes("--dry-run");

  switch (command) {
    case "show":
      show();
      return;
    case "set":
      if (!arg) {
        console.error("Usage: node tools/zbrs-version-manager.js set <major.minor> [--dry-run]");
        process.exit(1);
      }
      setVersion(arg, dryRun);
      return;
    default:
      console.log("ZBRS Version Manager");
      console.log("Usage:");
      console.log("  node tools/zbrs-version-manager.js show");
      console.log("  node tools/zbrs-version-manager.js set <major.minor> [--dry-run]");
  }
}

main();
