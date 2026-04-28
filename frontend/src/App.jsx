import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function StatusBadge({ days }) {
  const config = days === null
    ? { label: 'Never ordered', color: '#f59e0b', bg: 'rgba(245,158,11,.12)' }
    : days <= 0
    ? { label: 'Due now ⚠️', color: '#ef4444', bg: 'rgba(239,68,68,.12)' }
    : days <= 2
    ? { label: 'Due soon', color: '#f59e0b', bg: 'rgba(245,158,11,.12)' }
    : { label: `In ${days}d`, color: '#22c55e', bg: 'rgba(34,197,94,.12)' };

  return (
    <span style={{
      background: config.bg, color: config.color,
      padding: '4px 12px', borderRadius: 99, fontSize: 11,
      fontWeight: 600, letterSpacing: '.3px', textTransform: 'uppercase',
      border: `1px solid ${config.color}22`,
    }}>
      {config.label}
    </span>
  );
}

// ── Animated counter ─────────────────────────────────────────────────────────

function AnimNum({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = Number(value) || 0;
    if (end === 0) { setDisplay(0); return; }
    const dur = 600;
    const step = Math.max(1, Math.floor(dur / end));
    const timer = setInterval(() => {
      start += 1;
      setDisplay(start);
      if (start >= end) clearInterval(timer);
    }, step);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}</>;
}

// ── CSS-in-JS tokens ────────────────────────────────────────────────────────

const C = {
  bg: '#0a0a0f',
  surface: '#111118',
  surface2: '#18181f',
  border: 'rgba(255,255,255,.06)',
  border2: 'rgba(255,255,255,.1)',
  text: '#e4e4e7',
  muted: '#71717a',
  accent: '#f97316',
  accentGlow: 'rgba(249,115,22,.25)',
  gemini: '#4285f4',
  geminiGlow: 'rgba(66,133,244,.2)',
  green: '#22c55e',
  red: '#ef4444',
  radius: 14,
};

// ── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState(null);
  const [tab, setTab] = useState('items');
  const [loading, setLoading] = useState(false);
  const [agentLog, setAgentLog] = useState('');
  const [chatMsg, setChatMsg] = useState('');
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, unit: 'unit', frequency_days: 7 });
  const [pulse, setPulse] = useState(false);
  const chatEndRef = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      const [i, o, l, s] = await Promise.all([
        api.get('/items'), api.get('/orders'), api.get('/logs'), api.get('/status'),
      ]);
      setItems(i.data); setOrders(o.data); setLogs(l.data); setStatus(s.data);
    } catch (e) { console.error('Fetch error:', e); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function runRestock() {
    setLoading(true); setPulse(true);
    setAgentLog('🤖 Gemini Agent running restock cycle...\n');
    setTab('chat');
    try {
      const { data } = await api.post('/agent/restock');
      setAgentLog(p => p + `\n✅ Status: ${data.status}\n${data.summary || ''}`);
      fetchAll();
    } catch (e) {
      setAgentLog(p => p + `\n❌ Error: ${e.response?.data?.error || e.message}`);
    } finally { setLoading(false); setPulse(false); }
  }

  async function addItem(e) {
    e.preventDefault();
    if (!newItem.name.trim()) return;
    await api.post('/items', newItem);
    setNewItem({ name: '', quantity: 1, unit: 'unit', frequency_days: 7 });
    fetchAll();
  }

  async function deleteItem(id) {
    await api.delete(`/items/${id}`);
    fetchAll();
  }

  async function sendChat() {
    if (!chatMsg.trim()) return;
    setLoading(true);
    const msg = chatMsg;
    setChatMsg('');
    setAgentLog(`💬 You: ${msg}\n\n🤖 Gemini thinking...`);
    try {
      const { data } = await api.post('/agent/chat', { message: msg });
      setAgentLog(`💬 You: ${msg}\n\n🤖 Gemini:\n${data.response}`);
    } catch (e) {
      setAgentLog(`❌ ${e.message}`);
    } finally { setLoading(false); }
  }

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [agentLog]);

  const dueCount = items.filter(i => daysUntil(i.next_restock_at) <= 0 || !i.next_restock_at).length;

  // ── Styles ──────────────────────────────────────────────────────────────────

  const wrap = {
    maxWidth: 960, margin: '0 auto', padding: '32px 20px', minHeight: '100vh',
  };

  const header = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 32, flexWrap: 'wrap', gap: 16,
  };

  const logoArea = { display: 'flex', alignItems: 'center', gap: 14 };

  const logoIcon = {
    width: 48, height: 48, borderRadius: 14,
    background: `linear-gradient(135deg, ${C.accent}, #fb923c)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 24, boxShadow: `0 0 24px ${C.accentGlow}`,
  };

  const titleStyle = { fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-.3px' };
  const subStyle = { fontSize: 12, color: C.muted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 };

  const geminiDot = {
    width: 7, height: 7, borderRadius: '50%',
    background: C.gemini, boxShadow: `0 0 8px ${C.geminiGlow}`,
    display: 'inline-block',
  };

  const mockBadge = {
    fontSize: 11, fontWeight: 600, letterSpacing: '.4px', textTransform: 'uppercase',
    padding: '5px 14px', borderRadius: 99,
    background: status?.mock_mode ? 'rgba(245,158,11,.1)' : 'rgba(34,197,94,.1)',
    color: status?.mock_mode ? '#f59e0b' : '#22c55e',
    border: `1px solid ${status?.mock_mode ? 'rgba(245,158,11,.2)' : 'rgba(34,197,94,.2)'}`,
  };

  const restockBtn = {
    padding: '10px 22px', borderRadius: 10, border: 'none', cursor: loading ? 'wait' : 'pointer',
    fontWeight: 600, fontSize: 13, letterSpacing: '.2px',
    background: loading ? C.surface2 : `linear-gradient(135deg, ${C.accent}, #fb923c)`,
    color: '#fff', transition: 'all .3s ease',
    boxShadow: loading ? 'none' : `0 4px 20px ${C.accentGlow}`,
    opacity: loading ? .6 : 1,
    animation: pulse ? 'pulse 1.5s infinite' : 'none',
  };

  const statsGrid = {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 14, marginBottom: 28,
  };

  const statCard = (accent) => ({
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: C.radius, padding: '20px 22px',
    position: 'relative', overflow: 'hidden',
  });

  const statNum = (accent) => ({
    fontSize: 32, fontWeight: 800, color: accent,
    letterSpacing: '-1px', lineHeight: 1,
  });

  const statLabel = { fontSize: 11, color: C.muted, marginTop: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.6px' };

  const tabBar = {
    display: 'flex', gap: 2, marginBottom: 24,
    background: C.surface, borderRadius: 12, padding: 4,
    border: `1px solid ${C.border}`,
  };

  const tabBtn = (active) => ({
    flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
    fontWeight: active ? 600 : 400, fontSize: 13, borderRadius: 10,
    background: active ? C.surface2 : 'transparent',
    color: active ? '#fff' : C.muted,
    transition: 'all .2s ease',
    position: 'relative',
  });

  const card = {
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: C.radius, padding: '20px 24px', marginBottom: 14,
  };

  const inputStyle = {
    padding: '10px 14px', borderRadius: 10,
    border: `1px solid ${C.border2}`, fontSize: 13,
    background: C.surface2, color: C.text, outline: 'none',
    transition: 'border-color .2s',
  };

  const btnPrimary = {
    padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: 13,
    background: `linear-gradient(135deg, ${C.accent}, #fb923c)`,
    color: '#fff', transition: 'all .2s',
    boxShadow: `0 2px 12px ${C.accentGlow}`,
  };

  const btnDanger = {
    padding: '6px 12px', borderRadius: 8, border: `1px solid rgba(239,68,68,.2)`,
    cursor: 'pointer', fontWeight: 500, fontSize: 12,
    background: 'rgba(239,68,68,.08)', color: '#ef4444',
    transition: 'all .2s',
  };

  const row = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 0', borderBottom: `1px solid ${C.border}`, gap: 12,
  };

  const terminalBox = {
    background: '#0c0c14', border: `1px solid ${C.border}`,
    borderRadius: C.radius, padding: 20,
    fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: 12,
    color: '#a3e635', minHeight: 220, maxHeight: 400, overflowY: 'auto',
    whiteSpace: 'pre-wrap', lineHeight: 1.8,
    boxShadow: 'inset 0 2px 12px rgba(0,0,0,.4)',
  };

  return (
    <div style={wrap}>
      {/* Keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 4px 20px ${C.accentGlow}; }
          50% { box-shadow: 0 4px 40px ${C.accentGlow}, 0 0 60px ${C.accentGlow}; }
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn .4s ease both; }
        input:focus { border-color: ${C.accent} !important; box-shadow: 0 0 0 3px ${C.accentGlow} !important; }
        button:hover { filter: brightness(1.1); }
        button:active { transform: scale(.97); }
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={header}>
        <div style={logoArea}>
          <div style={logoIcon}>🛒</div>
          <div>
            <h1 style={titleStyle}>Auto-Restock Agent</h1>
            <p style={subStyle}>
              <span style={geminiDot} />
              Powered by Swiggy Instamart + Google Gemini AI
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {status && <span style={mockBadge}>{status.mock_mode ? '◉ Mock' : '◉ Live'}</span>}
          <button style={restockBtn} onClick={runRestock} disabled={loading}>
            {loading ? '⏳ Running...' : '⚡ Run Restock'}
          </button>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      {status && (
        <div style={statsGrid} className="fade-in">
          <div style={statCard(C.accent)}>
            <div style={statNum(C.accent)}><AnimNum value={status.items_count} /></div>
            <div style={statLabel}>Household Items</div>
          </div>
          <div style={statCard(dueCount > 0 ? C.red : C.green)}>
            <div style={statNum(dueCount > 0 ? C.red : C.green)}><AnimNum value={dueCount} /></div>
            <div style={statLabel}>Due for Restock</div>
          </div>
          <div style={statCard(C.gemini)}>
            <div style={statNum(C.gemini)}><AnimNum value={status.orders_count} /></div>
            <div style={statLabel}>Orders Placed</div>
          </div>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div style={tabBar}>
        {[
          { key: 'items', icon: '📦', label: 'Items' },
          { key: 'orders', icon: '🧾', label: 'Orders' },
          { key: 'chat', icon: '💬', label: 'Chat' },
          { key: 'logs', icon: '📋', label: 'Logs' },
        ].map(t => (
          <button key={t.key} style={tabBtn(tab === t.key)} onClick={() => setTab(t.key)}>
            {t.icon} {t.label}
            {t.key === 'items' && dueCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 12,
                width: 8, height: 8, borderRadius: '50%',
                background: C.red, boxShadow: `0 0 6px ${C.red}`,
              }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Items Tab ───────────────────────────────────────────────────── */}
      {tab === 'items' && (
        <div className="fade-in">
          <div style={card}>
            <p style={{ fontWeight: 600, marginBottom: 14, fontSize: 14, color: '#fff' }}>
              ➕ Add Household Item
            </p>
            <form onSubmit={addItem} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input style={{ ...inputStyle, flex: 2, minWidth: 150 }} placeholder="Item name (e.g. Milk)"
                value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} required />
              <input style={{ ...inputStyle, width: 70 }} type="number" placeholder="Qty" min={1}
                value={newItem.quantity} onChange={e => setNewItem(p => ({ ...p, quantity: +e.target.value }))} />
              <input style={{ ...inputStyle, width: 80 }} placeholder="Unit"
                value={newItem.unit} onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))} />
              <input style={{ ...inputStyle, width: 90 }} type="number" placeholder="Days" min={1}
                value={newItem.frequency_days} onChange={e => setNewItem(p => ({ ...p, frequency_days: +e.target.value }))}
                title="Restock every N days" />
              <button type="submit" style={btnPrimary}>+ Add</button>
            </form>
          </div>

          <div style={card}>
            {items.length === 0 && (
              <p style={{ color: C.muted, textAlign: 'center', padding: 32, fontSize: 13 }}>
                No items yet — add your first household item above!
              </p>
            )}
            {items.map(item => (
              <div key={item.id} style={row}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>{item.name}</span>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>
                    {item.quantity} {item.unit} · every {item.frequency_days}d
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <StatusBadge days={daysUntil(item.next_restock_at)} />
                  <button style={btnDanger} onClick={() => deleteItem(item.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Orders Tab ──────────────────────────────────────────────────── */}
      {tab === 'orders' && (
        <div style={card} className="fade-in">
          {orders.length === 0 && (
            <p style={{ color: C.muted, textAlign: 'center', padding: 32, fontSize: 13 }}>
              No orders yet — run a restock cycle to place your first order!
            </p>
          )}
          {orders.map(order => (
            <div key={order.id} style={row}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>#{order.swiggy_order_id}</span>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>
                  {(() => { try { return JSON.parse(order.items || '[]').join(', '); } catch { return ''; } })()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                {order.total_amount && (
                  <span style={{ fontWeight: 700, color: C.green, fontSize: 15 }}>₹{order.total_amount}</span>
                )}
                <StatusBadge days={order.status === 'delivered' ? 99 : order.status === 'confirmed' ? 1 : null} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Chat Tab ────────────────────────────────────────────────────── */}
      {tab === 'chat' && (
        <div className="fade-in">
          <div style={terminalBox}>
            {agentLog || '🤖 Gemini Agent ready. Ask me anything about your groceries...'}
            <div ref={chatEndRef} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder='Ask the agent e.g. "What should I restock this week?"'
              value={chatMsg}
              onChange={e => setChatMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()}
            />
            <button style={btnPrimary} onClick={sendChat} disabled={loading}>
              {loading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* ── Logs Tab ────────────────────────────────────────────────────── */}
      {tab === 'logs' && (
        <div style={terminalBox} className="fade-in">
          {logs.length === 0 && '📋 No agent activity yet...'}
          {logs.map(log => (
            <div key={log.id} style={{ marginBottom: 4 }}>
              <span style={{ color: '#64748b' }}>[{new Date(log.created_at).toLocaleTimeString()}]</span>
              {' '}<span style={{ color: C.accent }}>{log.event}</span>
              {log.payload && <span style={{ color: '#94a3b8' }}> · {log.payload}</span>}
            </div>
          ))}
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginTop: 48, paddingBottom: 24, color: C.muted, fontSize: 11 }}>
        Built with <span style={{ color: C.gemini }}>Google Gemini AI</span> + Swiggy Instamart MCP
      </div>
    </div>
  );
}
