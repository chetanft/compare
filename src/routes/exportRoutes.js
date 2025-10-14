import { Router } from 'express';
import { listSnapshots, loadSnapshot, exportSnapshot } from '../storage/ComparisonSnapshots.js';

const router = Router();

router.get('/snapshots', (_req, res) => {
  res.success({ snapshots: listSnapshots() });
});

router.get('/snapshots/:id', (req, res) => {
  const snapshot = loadSnapshot(req.params.id);
  if (!snapshot) {
    return res.error('Snapshot not found', 404);
  }

  res.success({ snapshot });
});

router.post('/snapshots/:id/export', (req, res) => {
  const exported = exportSnapshot(req.params.id);
  if (!exported) {
    return res.error('Snapshot not found', 404);
  }

  res.success(exported);
});

export default router;
