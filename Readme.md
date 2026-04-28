# 🛒 Swiggy Auto-Restock Agent

> An AI-powered household grocery agent built on **Swiggy Instamart MCP APIs** — learns your consumption patterns and automatically restocks groceries before you run out.

Built for the **[Swiggy Builders Club](https://mcp.swiggy.com/builders/)** developer program.

---

## 🧠 What It Does

Most people forget to reorder groceries until they've already run out. This agent fixes that.

You tell it what items your household uses (milk, eggs, bread, etc.) and how often. The AI tracks your order history, predicts when you'll run out, and places a restock order on Swiggy Instamart — automatically, before it's too late.

**Core flow:**
```
User sets household items + frequency
        ↓
Agent monitors last order dates
        ↓
Google Gemini AI decides when to reorder
        ↓
Instamart APIs: search → cart → checkout → track
        ↓
User gets notified ✅
```

---

## ✨ Features

- 🤖 **AI-Powered Decisions** — Google Gemini (`gemini-2.0-flash`) acts as the reasoning brain, deciding *when* and *what* to reorder based on patterns
- 🔄 **Auto-Restock Logic** — Tracks consumption frequency and triggers orders proactively
- 🛍️ **Full Instamart Integration** — Uses Swiggy's live MCP APIs end-to-end
- 📦 **Order Tracking** — Monitors delivery status after each restock
- 🧾 **Order History** — Keeps a log of all past restocks per item
- 💬 **Natural Language Control** — Talk to the agent in plain English to update your list or trigger manual restocks
- 🎨 **Premium Dark UI** — Glassmorphic dashboard with animated counters and terminal-style agent logs

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| AI / Reasoning | Google Gemini (`gemini-2.0-flash`) via `@google/generative-ai` |
| Backend | Node.js (v18+) + Express |
| MCP Integration | Swiggy Instamart MCP Server |
| Frontend | React 18 + Vite |
| Storage | SQLite via `better-sqlite3` |
| Auth | OAuth 2.0 via Swiggy MCP |

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18 or higher
- A [Google AI Studio API key](https://aistudio.google.com/apikey)
- Swiggy Builders Club API access ([apply here](https://forms.gle/4vkeKyqm15Qb6fnJA))

### Installation

```bash
# Clone the repo
git clone https://github.com/BhuuX/swiggy-auto-restock-agent.git
cd swiggy-auto-restock-agent

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Set up environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### Environment Variables

Create a `.env` file in the root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
SWIGGY_CLIENT_ID=your_swiggy_client_id
SWIGGY_CLIENT_SECRET=your_swiggy_client_secret
SWIGGY_REDIRECT_URI=http://localhost:3000/callback
PORT=3000
USE_MOCK_SWIGGY=true
```

### Seed the Database

```bash
npm run seed
```

### Run the App

```bash
# Run both backend + frontend simultaneously
npm run dev:all
```

- Backend API: `http://localhost:3000`
- Frontend UI: `http://localhost:5173`

---

## 🗂️ Project Structure

```
swiggy-auto-restock-agent/
├── src/
│   ├── agent/
│   │   ├── restock-agent.js      # Core AI agent logic (Gemini)
│   │   └── prompts.js            # Gemini system prompts
│   ├── api/
│   │   └── instamart.js          # Swiggy Instamart MCP client + mock data
│   ├── logic/
│   │   └── scheduler.js          # Cron-based restock scheduler
│   ├── db/
│   │   └── store.js              # SQLite storage (items, orders, logs)
│   ├── routes/
│   │   └── api.js                # Express REST routes
│   └── server.js                 # Express server entry point
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Main React app (premium dark UI)
│   │   └── main.jsx              # React entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── scripts/
│   └── seed.js                   # Database seeder
├── .env.example
├── package.json
└── README.md
```

---

## 🔌 Swiggy MCP APIs Used

| Tool | Purpose |
|---|---|
| `search_products` | Find grocery items on Instamart |
| `update_cart` | Add items to cart |
| `get_cart` | Review cart before checkout |
| `checkout` | Place the restock order |
| `track_order` | Monitor delivery status |
| `get_orders` | Fetch order history for pattern learning |

---

## 💡 How the AI Works

The agent uses **Google Gemini** as its reasoning engine with native **function calling** (tool use). Gemini receives:

- The user's household item list and consumption frequency
- The last order date and quantity for each item
- A decision rule: *"If an item is predicted to run out within 2 days, trigger a restock"*

Gemini then calls the Instamart MCP tools in an agentic loop to complete the full restock flow — no human intervention needed. The function calling flow:

```
User prompt → Gemini → functionCall (search) → functionResponse
                     → functionCall (add_to_cart) → functionResponse
                     → functionCall (get_cart) → functionResponse
                     → functionCall (place_order) → functionResponse
                     → Final text summary ✅
```

---

## 📸 Demo

> 🎥 Demo video coming soon — building in progress!

---

## 🛣️ Roadmap

- [x] Project setup and architecture
- [x] Google Gemini AI integration with function calling
- [x] SQLite database with items, orders, and logs
- [x] Mock Swiggy Instamart data for development
- [x] React frontend dashboard (premium dark UI)
- [x] Seed script for quick setup
- [ ] Swiggy MCP OAuth integration (awaiting API approval)
- [ ] Consumption pattern tracker
- [ ] Notification system (email/WhatsApp)
- [ ] Multi-user household support

---

## 🤝 Built For

This project is built as part of the **[Swiggy Builders Club](https://mcp.swiggy.com/builders/)** — an open developer program to build AI agents on Swiggy's MCP platform.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 👤 Author

**Bhushan Nayak**
- GitHub: [@BhuuX](https://github.com/BhuuX)
- Email: bhushannayakay@gmail.com

---

<p align="center">Powered by <strong>Google Gemini AI</strong> ✨ + <strong>Swiggy Instamart MCP</strong> 🧡</p>
