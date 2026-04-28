import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../data/restock.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// ── Initialize sql.js (async, cached) ───────────────────────────────────────

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS household_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL UNIQUE,
      product_id  TEXT,
      quantity    REAL NOT NULL DEFAULT 1,
      unit        TEXT NOT NULL DEFAULT 'unit',
      frequency_days INTEGER NOT NULL DEFAULT 7,
      last_ordered_at TEXT,
      next_restock_at TEXT,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      swiggy_order_id TEXT,
      items         TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'pending',
      triggered_by  TEXT NOT NULL DEFAULT 'agent',
      total_amount  REAL,
      placed_at     TEXT DEFAULT (datetime('now')),
      delivered_at  TEXT
    );

    CREATE TABLE IF NOT EXISTS agent_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      event      TEXT NOT NULL,
      payload    TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  save();
  return db;
}

function save() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Helper: run a SELECT and return array of row objects
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}

function runSql(sql, params = []) {
  db.run(sql, params);
  save();
}

// ── Ensure DB is initialized before repos are used ──────────────────────────

await getDb();

// ── Household Items ─────────────────────────────────────────────────────────

export const itemsRepo = {
  getAll: () =>
    queryAll('SELECT * FROM household_items WHERE is_active = 1'),

  getById: (id) =>
    queryOne('SELECT * FROM household_items WHERE id = ?', [id]),

  upsert: (item) => {
    db.run(`
      INSERT INTO household_items (name, product_id, quantity, unit, frequency_days, next_restock_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        product_id     = excluded.product_id,
        quantity       = excluded.quantity,
        unit           = excluded.unit,
        frequency_days = excluded.frequency_days,
        next_restock_at = excluded.next_restock_at
    `, [item.name, item.product_id, item.quantity, item.unit, item.frequency_days, item.next_restock_at]);
    save();
  },

  markOrdered: (id) => {
    const now = new Date();
    const item = queryOne('SELECT * FROM household_items WHERE id = ?', [id]);
    if (!item) return;
    const next = new Date(now.getTime() + item.frequency_days * 86400000);
    db.run(
      'UPDATE household_items SET last_ordered_at = ?, next_restock_at = ? WHERE id = ?',
      [now.toISOString(), next.toISOString(), id]
    );
    save();
  },

  delete: (id) => {
    db.run('UPDATE household_items SET is_active = 0 WHERE id = ?', [id]);
    save();
  },

  getDueForRestock: () => {
    const now = new Date().toISOString();
    return queryAll(
      `SELECT * FROM household_items WHERE is_active = 1 AND (next_restock_at IS NULL OR next_restock_at <= ?)`,
      [now]
    );
  },
};

// ── Orders ──────────────────────────────────────────────────────────────────

export const ordersRepo = {
  getAll: () =>
    queryAll('SELECT * FROM orders ORDER BY placed_at DESC'),

  create: (order) => {
    db.run(`
      INSERT INTO orders (swiggy_order_id, items, status, triggered_by, total_amount)
      VALUES (?, ?, ?, ?, ?)
    `, [order.swiggy_order_id, JSON.stringify(order.items), order.status, order.triggered_by, order.total_amount]);
    save();
    const row = queryOne('SELECT last_insert_rowid() as id');
    return row?.id;
  },

  updateStatus: (id, status) => {
    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    save();
  },
};

// ── Agent Logs ──────────────────────────────────────────────────────────────

export const logsRepo = {
  add: (event, payload = null) => {
    db.run(
      'INSERT INTO agent_logs (event, payload) VALUES (?, ?)',
      [event, payload ? JSON.stringify(payload) : null]
    );
    save();
  },

  getRecent: (limit = 50) =>
    queryAll('SELECT * FROM agent_logs ORDER BY created_at DESC LIMIT ?', [limit]),
};

export default db;
