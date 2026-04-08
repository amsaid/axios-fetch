#!/usr/bin/env node
'use strict';

const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

const root = join(__dirname, '..');
const pkgPath = join(root, 'package.json');

// --- Helper: Run shell commands safely ---
function runCommand(command) {
  try {
    // On Windows, npm is npm.cmd. We use 'shell: true' to help resolve binaries in PATH.
    execSync(command, {
      stdio: 'inherit',
      cwd: root,
      env: process.env,
      shell: true
    });
  } catch (e) {
    console.error(`\nExecution failed: ${command}`);
    process.exit(1);
  }
}

// 1. Read current version
let pkg;
try {
  pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
} catch (e) {
  console.error('Could not read package.json');
  process.exit(1);
}

const current = pkg.version.split('.').map(Number);

// 2. Parse target version
const bump = process.argv[2];
if (!bump) {
  console.error('Usage: node scripts/version.js major|minor|patch|<version>');
  process.exit(1);
}

let newVersion;
if (['major', 'minor', 'patch'].includes(bump)) {
  const [major, minor, patch] = current;
  switch (bump) {
    case 'major': newVersion = `${major + 1}.0.0`; break;
    case 'minor': newVersion = `${major}.${minor + 1}.0`; break;
    case 'patch': newVersion = `${major}.${minor}.${patch + 1}`; break;
  }
} else {
  newVersion = bump;
}

// 3. Update package.json
console.log(`\nBumping version: ${pkg.version} → ${newVersion}`);
pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

// 4. Run Build and Tests
console.log('--- Rebuilding ---');
runCommand('npm run build');

console.log('\n--- Running tests ---');
runCommand('npm test');

// 5. Success Messaging
console.log(`\n✓ Version bumped to ${newVersion}`);
console.log('\nNext steps:');
console.log(`  git commit -am "chore: bump version to ${newVersion}"`);
console.log(`  git tag v${newVersion}`);
console.log(`  git push && git push --tags\n`);
