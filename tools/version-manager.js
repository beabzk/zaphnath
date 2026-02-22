#!/usr/bin/env node

/**
 * Version Manager Utility
 *
 * This script provides version management capabilities for Zaphnath Bible Reader.
 * It supports semantic bumps, custom versions, and release tag creation.
 */

import { readFileSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");
const packageJsonPath = join(rootDir, "package.json");

/**
 * Read and parse package.json
 */
function getPackageJson() {
  const content = readFileSync(packageJsonPath, "utf-8");
  return JSON.parse(content);
}

/**
 * Execute shell command in repo root
 */
function runCommand(command) {
  return execSync(command, {
    cwd: rootDir,
    encoding: "utf-8",
  }).trim();
}

/**
 * Parse semantic version
 */
function parseVersion(version) {
  const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/;
  const match = version.match(versionRegex);

  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }

  const [, major, minor, patch, prerelease] = match;

  return {
    major: parseInt(major, 10),
    minor: parseInt(minor, 10),
    patch: parseInt(patch, 10),
    prerelease: prerelease || null,
  };
}

/**
 * Validate version bump type
 */
function validateBumpType(current, target, bumpType) {
  const currentVer = parseVersion(current);
  const targetVer = parseVersion(target);

  switch (bumpType) {
    case "major":
      return (
        targetVer.major === currentVer.major + 1 &&
        targetVer.minor === 0 &&
        targetVer.patch === 0 &&
        !targetVer.prerelease
      );

    case "minor":
      return (
        targetVer.major === currentVer.major &&
        targetVer.minor === currentVer.minor + 1 &&
        targetVer.patch === 0 &&
        !targetVer.prerelease
      );

    case "patch":
      return (
        targetVer.major === currentVer.major &&
        targetVer.minor === currentVer.minor &&
        targetVer.patch === currentVer.patch + 1 &&
        !targetVer.prerelease
      );

    case "prerelease":
      return targetVer.prerelease !== null;

    default:
      return true;
  }
}

/**
 * Generate changelog entry
 */
function generateChangelogEntry(version, bumpType, previousVersion = null) {
  const date = new Date().toISOString().split("T")[0];
  const versionType = bumpType.charAt(0).toUpperCase() + bumpType.slice(1);
  const commits = getChangelogCommits(previousVersion);
  const commitLines = commits.length
    ? commits.map(({ subject, hash }) => `- ${subject} (${hash})`).join("\n")
    : "- No user-facing changes listed since the previous version.";

  return `## [${version}] - ${date}

### ${versionType} Release

### What's Changed

${commitLines}

`;
}

/**
 * Build changelog commit list from git history
 */
function getChangelogCommits(previousVersion = null) {
  let command =
    "git log --pretty=format:%s:::%h --no-merges -n 20";

  if (previousVersion) {
    const previousTag = `v${previousVersion}`;
    if (tagExists(previousTag)) {
      command = `git log ${previousTag}..HEAD --pretty=format:%s:::%h --no-merges`;
    }
  }

  let output = "";
  try {
    output = runCommand(command);
  } catch {
    return [];
  }

  if (!output) {
    return [];
  }

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [subject = "", hash = ""] = line.split(":::");
      return { subject, hash };
    })
    .filter(({ subject }) => !isVersionBumpCommit(subject));
}

/**
 * Filter out auto-generated version bump commits
 */
function isVersionBumpCommit(subject) {
  return (
    /^chore\(release\): bump version to /i.test(subject) ||
    /^v\d+\.\d+\.\d+/.test(subject)
  );
}

/**
 * Check if a local tag exists
 */
function tagExists(tagName) {
  const result = runCommand(`git tag --list ${tagName}`);
  return result.split("\n").includes(tagName);
}

/**
 * Create tag for current package version
 */
function createCurrentVersionTag(options = { push: false }) {
  const pkg = getPackageJson();
  const tagName = `v${pkg.version}`;

  if (tagExists(tagName)) {
    console.log(`ℹ️ Tag already exists: ${tagName}`);
    return tagName;
  }

  runCommand(`git tag -a ${tagName} -m "Release ${tagName}"`);
  console.log(`🏷️ Created tag: ${tagName}`);

  if (options.push) {
    runCommand(`git push origin ${tagName}`);
    console.log(`⬆️ Pushed tag: ${tagName}`);
  }

  return tagName;
}

/**
 * Display version information
 */
function showVersionInfo() {
  const pkg = getPackageJson();
  const version = parseVersion(pkg.version);

  console.log("📦 Zaphnath Bible Reader Version Information");
  console.log("==========================================");
  console.log(`Current Version: ${pkg.version}`);
  console.log(`Tag: v${pkg.version}`);
  console.log(`Major: ${version.major}`);
  console.log(`Minor: ${version.minor}`);
  console.log(`Patch: ${version.patch}`);
  if (version.prerelease) {
    console.log(`Prerelease: ${version.prerelease}`);
  }
  console.log(`Is Prerelease: ${version.prerelease ? "Yes" : "No"}`);
  console.log("");
}

/**
 * Bump version
 */
function bumpVersion(bumpType, customVersion = null, options = {}) {
  const { changelog = false, gitTag = true } = options;

  const pkg = getPackageJson();
  const currentVersion = pkg.version;

  console.log(`🔄 Bumping version from ${currentVersion}...`);

  if (customVersion) {
    try {
      parseVersion(customVersion);
    } catch {
      console.error(`❌ Invalid version format: ${customVersion}`);
      process.exit(1);
    }

    if (customVersion === currentVersion) {
      console.log(`ℹ️ Version unchanged: ${currentVersion}`);
      if (gitTag) {
        console.log("ℹ️ No version bump performed; run `npm run version:tag` to tag current version.");
      }

      if (changelog) {
        const changelogEntry = generateChangelogEntry(
          currentVersion,
          "custom",
          null
        );
        console.log("\n📝 Suggested changelog entry:");
        console.log("================================");
        console.log(changelogEntry);
      }

      return currentVersion;
    }
  }

  const npmVersionTarget = customVersion || bumpType;
  const noTagArg = gitTag ? "" : " --no-git-tag-version";

  let newVersion;
  try {
    const result = runCommand(`npm version ${npmVersionTarget}${noTagArg}`);
    newVersion = result.replace(/^v/, "");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to bump version: ${message}`);
    process.exit(1);
  }

  if (!customVersion && !validateBumpType(currentVersion, newVersion, bumpType)) {
    console.error(
      `❌ Invalid version bump: ${currentVersion} → ${newVersion} (${bumpType})`
    );
    process.exit(1);
  }

  console.log(`✅ Version bumped: ${currentVersion} → ${newVersion}`);
  if (gitTag) {
    console.log(`🏷️ Created release commit and tag: v${newVersion}`);
  } else {
    console.log("ℹ️ No git tag created (--no-tag)");
  }

  if (changelog) {
    const changelogEntry = generateChangelogEntry(
      newVersion,
      customVersion ? "custom" : bumpType,
      currentVersion
    );
    console.log("\n📝 Suggested changelog entry:");
    console.log("================================");
    console.log(changelogEntry);
  }

  return newVersion;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const noTag = args.includes("--no-tag");
  const withChangelog = args.includes("--changelog");
  const push = args.includes("--push");

  switch (command) {
    case "show":
    case "info":
      showVersionInfo();
      break;

    case "patch":
      bumpVersion("patch", null, { changelog: withChangelog, gitTag: !noTag });
      break;

    case "minor":
      bumpVersion("minor", null, { changelog: withChangelog, gitTag: !noTag });
      break;

    case "major":
      bumpVersion("major", null, { changelog: withChangelog, gitTag: !noTag });
      break;

    case "prerelease":
      bumpVersion("prerelease", null, {
        changelog: withChangelog,
        gitTag: !noTag,
      });
      break;

    case "set": {
      const customVersion = args[1];
      if (!customVersion) {
        console.error(
          "❌ Please provide a version number: node tools/version-manager.js set 1.0.0"
        );
        process.exit(1);
      }
      bumpVersion("custom", customVersion, {
        changelog: withChangelog,
        gitTag: !noTag,
      });
      break;
    }

    case "tag":
      createCurrentVersionTag({ push });
      break;

    case "help":
    case "--help":
    case "-h":
    default:
      console.log("🔧 Zaphnath Version Manager");
      console.log("===========================");
      console.log("");
      console.log("Usage: node tools/version-manager.js <command> [options]");
      console.log("");
      console.log("Commands:");
      console.log("  show, info          Show current version information");
      console.log("  patch               Bump patch version (0.1.0 → 0.1.1)");
      console.log("  minor               Bump minor version (0.1.0 → 0.2.0)");
      console.log("  major               Bump major version (0.1.0 → 1.0.0)");
      console.log("  prerelease          Bump prerelease version (0.1.0 → 0.1.1-0)");
      console.log("  set <version>       Set specific version (e.g., 1.0.0-beta.1)");
      console.log("  tag                 Create annotated tag for current version");
      console.log("  help                Show this help message");
      console.log("");
      console.log("Options:");
      console.log("  --changelog         Generate changelog entry suggestion");
      console.log("  --no-tag            Bump version without creating git tag/commit");
      console.log("  --push              Push tag when used with `tag` command");
      console.log("");
      console.log("Examples:");
      console.log("  node tools/version-manager.js show");
      console.log("  node tools/version-manager.js patch --changelog");
      console.log("  node tools/version-manager.js set 1.0.0-beta.1");
      console.log("  node tools/version-manager.js tag --push");
      console.log("");
      break;
  }
}

main();
