#!/usr/bin/env node

/**
 * Version Manager Utility
 * 
 * This script provides advanced version management capabilities for Zaphnath Bible Reader.
 * It extends the basic npm version commands with additional features and validation.
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const packageJsonPath = join(rootDir, 'package.json');

/**
 * Read and parse package.json
 */
function getPackageJson() {
  const content = readFileSync(packageJsonPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Write package.json
 */
function writePackageJson(packageData) {
  const content = JSON.stringify(packageData, null, 2) + '\n';
  writeFileSync(packageJsonPath, content, 'utf-8');
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
    toString() {
      return prerelease ? `${major}.${minor}.${patch}-${prerelease}` : `${major}.${minor}.${patch}`;
    }
  };
}

/**
 * Validate version bump type
 */
function validateBumpType(current, target, bumpType) {
  const currentVer = parseVersion(current);
  const targetVer = parseVersion(target);
  
  switch (bumpType) {
    case 'major':
      return targetVer.major === currentVer.major + 1 && 
             targetVer.minor === 0 && 
             targetVer.patch === 0 && 
             !targetVer.prerelease;
    
    case 'minor':
      return targetVer.major === currentVer.major && 
             targetVer.minor === currentVer.minor + 1 && 
             targetVer.patch === 0 && 
             !targetVer.prerelease;
    
    case 'patch':
      return targetVer.major === currentVer.major && 
             targetVer.minor === currentVer.minor && 
             targetVer.patch === currentVer.patch + 1 && 
             !targetVer.prerelease;
    
    case 'prerelease':
      return targetVer.prerelease !== null;
    
    default:
      return true; // Allow custom versions
  }
}

/**
 * Generate changelog entry
 */
function generateChangelogEntry(version, bumpType) {
  const date = new Date().toISOString().split('T')[0];
  const versionType = bumpType.charAt(0).toUpperCase() + bumpType.slice(1);
  
  return `## [${version}] - ${date}

### ${versionType} Release

- TODO: Add changelog entries for this release

`;
}

/**
 * Display version information
 */
function showVersionInfo() {
  const pkg = getPackageJson();
  const version = parseVersion(pkg.version);
  
  console.log('📦 Zaphnath Bible Reader Version Information');
  console.log('==========================================');
  console.log(`Current Version: ${pkg.version}`);
  console.log(`Major: ${version.major}`);
  console.log(`Minor: ${version.minor}`);
  console.log(`Patch: ${version.patch}`);
  if (version.prerelease) {
    console.log(`Prerelease: ${version.prerelease}`);
  }
  console.log(`Is Prerelease: ${version.prerelease ? 'Yes' : 'No'}`);
  console.log('');
}

/**
 * Bump version
 */
function bumpVersion(bumpType, customVersion = null) {
  const pkg = getPackageJson();
  const currentVersion = pkg.version;
  
  console.log(`🔄 Bumping version from ${currentVersion}...`);
  
  let newVersion;
  
  if (customVersion) {
    // Validate custom version format
    try {
      parseVersion(customVersion);
      newVersion = customVersion;
    } catch (error) {
      console.error(`❌ Invalid version format: ${customVersion}`);
      process.exit(1);
    }
  } else {
    // Use npm version command
    try {
      const result = execSync(`npm version ${bumpType} --no-git-tag-version`, { 
        cwd: rootDir, 
        encoding: 'utf-8' 
      });
      newVersion = result.trim().replace('v', '');
    } catch (error) {
      console.error(`❌ Failed to bump version: ${error.message}`);
      process.exit(1);
    }
  }
  
  // Validate the bump
  if (!customVersion && !validateBumpType(currentVersion, newVersion, bumpType)) {
    console.error(`❌ Invalid version bump: ${currentVersion} → ${newVersion} (${bumpType})`);
    process.exit(1);
  }
  
  console.log(`✅ Version bumped: ${currentVersion} → ${newVersion}`);
  
  // Generate changelog entry
  if (process.argv.includes('--changelog')) {
    const changelogEntry = generateChangelogEntry(newVersion, bumpType);
    console.log('\n📝 Suggested changelog entry:');
    console.log('================================');
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
  
  switch (command) {
    case 'show':
    case 'info':
      showVersionInfo();
      break;
    
    case 'patch':
      bumpVersion('patch');
      break;
    
    case 'minor':
      bumpVersion('minor');
      break;
    
    case 'major':
      bumpVersion('major');
      break;
    
    case 'prerelease':
      bumpVersion('prerelease');
      break;
    
    case 'set': {
      const customVersion = args[1];
      if (!customVersion) {
        console.error('❌ Please provide a version number: node version-manager.js set 1.0.0');
        process.exit(1);
      }
      bumpVersion('custom', customVersion);
      break;
    }
    
    case 'help':
    case '--help':
    case '-h':
    default:
      console.log('🔧 Zaphnath Version Manager');
      console.log('===========================');
      console.log('');
      console.log('Usage: node tools/version-manager.js <command> [options]');
      console.log('');
      console.log('Commands:');
      console.log('  show, info          Show current version information');
      console.log('  patch               Bump patch version (0.1.0 → 0.1.1)');
      console.log('  minor               Bump minor version (0.1.0 → 0.2.0)');
      console.log('  major               Bump major version (0.1.0 → 1.0.0)');
      console.log('  prerelease          Bump prerelease version (0.1.0 → 0.1.1-0)');
      console.log('  set <version>       Set specific version (e.g., 1.0.0-beta.1)');
      console.log('  help                Show this help message');
      console.log('');
      console.log('Options:');
      console.log('  --changelog         Generate changelog entry suggestion');
      console.log('');
      console.log('Examples:');
      console.log('  node tools/version-manager.js show');
      console.log('  node tools/version-manager.js patch --changelog');
      console.log('  node tools/version-manager.js set 1.0.0-beta.1');
      console.log('');
      break;
  }
}

// Run the script
main();
