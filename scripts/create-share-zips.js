#!/usr/bin/env node

/**
 * Versioned share bundle creator
 *
 * Generates zip archives for:
 *  - Web distribution bundle (source + scripts, no node_modules)
 *  - macOS distribution bundle (DMG installers)
 *
 * Usage:
 *   node scripts/create-share-zips.js           # create both archives
 *   node scripts/create-share-zips.js --web-only
 *   node scripts/create-share-zips.js --mac-only
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SHARE_DIR = path.join(ROOT_DIR, 'share');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

function readVersion() {
  const packageJsonPath = path.join(ROOT_DIR, 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error(`package.json not found at ${packageJsonPath}`);
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  if (!packageJson.version) {
    throw new Error('Version not found in package.json');
  }

  return packageJson.version;
}

function ensureDirectory(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

function removeIfExists(filePath) {
  if (existsSync(filePath)) {
    rmSync(filePath, { force: true });
  }
}

function runZip({ outputPath, sources, excludes = [] }) {
  if (!sources.length) {
    console.warn(`⚠️  No sources provided for ${outputPath}. Skipping.`);
    return;
  }

  const args = ['-r', outputPath, ...sources];
  const defaultExcludes = ['*.DS_Store', '*/.DS_Store', '__MACOSX/*'];
  [...excludes, ...defaultExcludes].forEach((pattern) => {
    args.push('-x', pattern);
  });

  console.log(`📦 Creating ${outputPath}`);
  const result = spawnSync('zip', args, {
    cwd: ROOT_DIR,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error(`zip command failed for ${outputPath}`);
  }
}

function createWebBundle(version) {
  const outputRelative = path.join('share', `FigmaComparison-Web-v${version}.zip`);
  const outputAbsolute = path.join(ROOT_DIR, outputRelative);

  removeIfExists(outputAbsolute);

  const candidateSources = [
    'start.command',
    'server.js',
    'package.json',
    'package-lock.json',
    'src',
    'frontend',
    'scripts',
    'config.json',
    'config.example.json',
    'public',
    'env.example',
    'env.next-version.example',
    'README.md'
  ];

  const sources = candidateSources.filter((entry) => existsSync(path.join(ROOT_DIR, entry)));

  runZip({
    outputPath: outputRelative,
    sources,
    excludes: [
      'frontend/node_modules/*',
      'frontend/node_modules/**/*',
      'frontend/dist/*',
      'frontend/dist/**/*',
      'frontend/.vite/*',
      'frontend/.vite/**/*',
      'frontend/.cache/*',
      'frontend/.cache/**/*'
    ]
  });
}

function createMacBundle(version) {
  const dmgIntel = `Figma Comparison Tool-${version}.dmg`;
  const dmgArm = `Figma Comparison Tool-${version}-arm64.dmg`;

  const availableDmgs = [];

  [dmgIntel, dmgArm].forEach((fileName) => {
    const dmgPath = path.join(DIST_DIR, fileName);
    if (existsSync(dmgPath)) {
      availableDmgs.push(path.relative(ROOT_DIR, dmgPath));
    }
  });

  if (!availableDmgs.length) {
    const distContents = existsSync(DIST_DIR) ? readdirSync(DIST_DIR) : [];
    console.warn('⚠️  No DMG files matching current version found in dist/. Skipping mac bundle.');
    console.warn(`   Expected: ${dmgIntel}, ${dmgArm}`);
    console.warn(`   dist/ contents: ${distContents.join(', ') || '(empty)'}`);
    return;
  }

  const outputRelative = path.join('share', `FigmaComparison-Mac-v${version}.zip`);
  const outputAbsolute = path.join(ROOT_DIR, outputRelative);

  removeIfExists(outputAbsolute);

  runZip({
    outputPath: outputRelative,
    sources: availableDmgs
  });
}

function main() {
  const args = process.argv.slice(2);
  const webOnly = args.includes('--web-only');
  const macOnly = args.includes('--mac-only');

  if (webOnly && macOnly) {
    console.error('❌ --web-only and --mac-only cannot be used together.');
    process.exit(1);
  }

  try {
    ensureDirectory(SHARE_DIR);
    const version = readVersion();
    console.log(`ℹ️  Detected version ${version}`);

    if (!macOnly) {
      createWebBundle(version);
    } else {
      console.log('⏩ Skipping web bundle (--mac-only specified)');
    }

    if (!webOnly) {
      createMacBundle(version);
    } else {
      console.log('⏩ Skipping mac bundle (--web-only specified)');
    }

    console.log('✅ Share bundles complete');
  } catch (error) {
    console.error('❌ Failed to create share bundles:', error.message);
    process.exit(1);
  }
}

main();


