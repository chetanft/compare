import fs from 'fs';
import os from 'os';
import path from 'path';

const APP_NAME = 'Figma Comparison Tool';
const DEFAULT_BASE_DIR = path.join(process.cwd(), 'output');

function resolveCustomDir() {
  const customDir = process.env.APP_OUTPUT_DIR || process.env.OUTPUT_DIR;
  if (!customDir) {
    return null;
  }
  return path.isAbsolute(customDir) ? customDir : path.resolve(customDir);
}

function resolvePlatformDir() {
  if (process.env.NODE_ENV === 'development') {
    return DEFAULT_BASE_DIR;
  }

  switch (process.platform) {
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', APP_NAME, 'output');
    case 'win32':
      return path.join(os.homedir(), 'AppData', 'Roaming', APP_NAME, 'output');
    default:
      return path.join(os.homedir(), '.config', APP_NAME, 'output');
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getOutputBaseDir() {
  const custom = resolveCustomDir();
  const baseDir = custom || resolvePlatformDir();
  ensureDir(baseDir);
  return baseDir;
}

export function resolveOutputPath(...segments) {
  const baseDir = getOutputBaseDir();
  const target = path.join(baseDir, ...segments);
  ensureDir(path.dirname(target));
  return target;
}

export function getReportsDir() {
  const dir = path.join(getOutputBaseDir(), 'reports');
  ensureDir(dir);
  return dir;
}

export function getImagesDir() {
  const dir = path.join(getOutputBaseDir(), 'images');
  ensureDir(dir);
  return dir;
}

export function getScreenshotsDir() {
  const dir = path.join(getOutputBaseDir(), 'screenshots');
  ensureDir(dir);
  return dir;
}

export default {
  getOutputBaseDir,
  getReportsDir,
  getImagesDir,
  getScreenshotsDir,
  resolveOutputPath
};

