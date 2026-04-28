import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api.js';
import { startScheduler } from './logic/scheduler.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173' })); // Vite dev server
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

// ── OAuth callback (placeholder until Swiggy keys arrive) ───────────────────
app.get('/callback', (req, res) => {
  const { code } = req.query;
  console.log('[OAuth] Received code:', code);
  // TODO: exchange code for access token once Swiggy credentials are active
  res.send('<h2>Auth callback received ✅ — implement token exchange here</h2>');
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📦 Mock Swiggy: ${process.env.USE_MOCK_SWIGGY !== 'false' ? 'ON' : 'OFF'}`);
  console.log(`🤖 Gemini key: ${process.env.GEMINI_API_KEY ? '✅ set' : '❌ missing'}\n`);

  // Start daily scheduler (8 AM every day)
  startScheduler('0 8 * * *');
});

export default app;
