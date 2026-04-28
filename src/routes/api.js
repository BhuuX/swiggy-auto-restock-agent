import { Router } from 'express';
import { restockAgent } from '../agent/restock-agent.js';
import { itemsRepo, ordersRepo, logsRepo } from '../db/store.js';
import { getSchedulerStatus } from '../logic/scheduler.js';

const router = Router();

// ── Items ────────────────────────────────────────────────────────────────────

router.get('/items', (req, res) => {
  res.json(itemsRepo.getAll());
});

router.post('/items', (req, res) => {
  const { name, product_id, quantity, unit, frequency_days } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const next = new Date(Date.now() + (frequency_days || 7) * 86400000);

  itemsRepo.upsert({
    name,
    product_id: product_id || null,
    quantity: quantity || 1,
    unit: unit || 'unit',
    frequency_days: frequency_days || 7,
    next_restock_at: next.toISOString(),
  });

  res.json({ success: true });
});

router.delete('/items/:id', (req, res) => {
  itemsRepo.delete(req.params.id);
  res.json({ success: true });
});

// ── Agent ────────────────────────────────────────────────────────────────────

router.post('/agent/restock', async (req, res) => {
  try {
    const result = await restockAgent.runRestockCycle('manual');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/agent/restock/:id', async (req, res) => {
  try {
    const result = await restockAgent.restockItem(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/agent/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    const result = await restockAgent.chat(message);
    res.json({ response: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/agent/analyse', async (req, res) => {
  try {
    const result = await restockAgent.analysePatterns();
    res.json({ analysis: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Orders ───────────────────────────────────────────────────────────────────

router.get('/orders', (req, res) => {
  res.json(ordersRepo.getAll());
});

// ── Logs & Status ────────────────────────────────────────────────────────────

router.get('/logs', (req, res) => {
  res.json(logsRepo.getRecent(50));
});

router.get('/status', (req, res) => {
  res.json({
    mock_mode: process.env.USE_MOCK_SWIGGY !== 'false',
    scheduler: getSchedulerStatus(),
    items_count: itemsRepo.getAll().length,
    orders_count: ordersRepo.getAll().length,
  });
});

export default router;
