import fs from 'fs';
import path from 'path';

const SNAPSHOT_DIR = process.env.SNAPSHOT_DIR || path.join(process.cwd(), 'output', 'snapshots');
const EXPORT_DIR = process.env.SNAPSHOT_EXPORT_DIR || path.join(process.cwd(), 'output', 'exports');
const INDEX_FILE = path.join(SNAPSHOT_DIR, 'index.json');

function ensureSnapshotDir() {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }
  if (!fs.existsSync(INDEX_FILE)) {
    fs.writeFileSync(INDEX_FILE, JSON.stringify({ records: [] }, null, 2));
  }
}

function readIndex() {
  ensureSnapshotDir();
  const raw = fs.readFileSync(INDEX_FILE, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.records)) {
      return parsed.records;
    }
  } catch (error) {
    // noop - return empty array below
  }
  return [];
}

function writeIndex(records) {
  ensureSnapshotDir();
  fs.writeFileSync(INDEX_FILE, JSON.stringify({ records }, null, 2));
}

export function saveSnapshot(record, payload) {
  ensureSnapshotDir();
  const payloadFile = path.join(SNAPSHOT_DIR, `${record.id}.json`);
  fs.writeFileSync(payloadFile, JSON.stringify(payload, null, 2));

  const existing = readIndex().filter((item) => item.id !== record.id);
  existing.push({ ...record, payloadPath: payloadFile });
  writeIndex(existing);
}

export function loadSnapshot(id) {
  const record = readIndex().find((item) => item.id === id);
  if (!record) {
    return null;
  }

  try {
    const payload = fs.readFileSync(record.payloadPath, 'utf-8');
    return JSON.parse(payload);
  } catch (error) {
    return null;
  }
}

export function exportSnapshot(id) {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }

  const record = readIndex().find((item) => item.id === id);
  if (!record) {
    return null;
  }

  const snapshot = loadSnapshot(id);
  if (!snapshot) {
    return null;
  }

  const exportId = `${id}-${Date.now()}`;
  const bundlePath = path.join(EXPORT_DIR, `${exportId}.json`);
  fs.writeFileSync(bundlePath, JSON.stringify({ exportId, snapshot }, null, 2));

  return {
    exportId,
    bundlePath,
    bundleUrl: `/exports/${exportId}.json`
  };
}

export function listSnapshots() {
  return readIndex().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function pruneSnapshots(limit = 100) {
  const records = readIndex();
  if (records.length <= limit) {
    return;
  }

  const sorted = [...records].sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  const toRemove = sorted.slice(0, sorted.length - limit);

  for (const record of toRemove) {
    if (record.payloadPath && fs.existsSync(record.payloadPath)) {
      fs.unlinkSync(record.payloadPath);
    }
  }

  const remaining = records.filter((record) => !toRemove.includes(record));
  writeIndex(remaining);
}

export default {
  saveSnapshot,
  loadSnapshot,
  listSnapshots,
  pruneSnapshots,
  exportSnapshot
};

