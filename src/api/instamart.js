/**
 * Swiggy Instamart MCP Client
 *
 * USE_MOCK_SWIGGY=true  → returns realistic fake data (use while waiting for API approval)
 * USE_MOCK_SWIGGY=false → calls real Swiggy Instamart MCP endpoints
 */

import axios from 'axios';
import 'dotenv/config';

const MOCK = process.env.USE_MOCK_SWIGGY !== 'false';
const BASE = process.env.SWIGGY_MCP_BASE_URL || 'https://mcp.swiggy.com';

// ── Token store (in-memory; swap for Redis in prod) ──────────────────────────
let _accessToken = null;
let _tokenExpiry = 0;

async function getToken() {
  if (_accessToken && Date.now() < _tokenExpiry) return _accessToken;

  if (MOCK) {
    _accessToken = 'mock_token_abc123';
    _tokenExpiry = Date.now() + 3600_000;
    return _accessToken;
  }

  const { data } = await axios.post(`${BASE}/oauth/token`, {
    grant_type: 'client_credentials',
    client_id: process.env.SWIGGY_CLIENT_ID,
    client_secret: process.env.SWIGGY_CLIENT_SECRET,
  });

  _accessToken = data.access_token;
  _tokenExpiry = Date.now() + data.expires_in * 1000;
  return _accessToken;
}

async function call(tool, params = {}) {
  if (MOCK) return mockDispatch(tool, params);

  const token = await getToken();
  const { data } = await axios.post(
    `${BASE}/instamart/mcp`,
    { tool, params },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

// ── Public API ────────────────────────────────────────────────────────────────

export const instamart = {
  /** Search for a product by name */
  searchProducts: (query, limit = 5) =>
    call('search_products', { query, limit }),

  /** Add / update item in cart */
  updateCart: (productId, quantity) =>
    call('update_cart', { product_id: productId, quantity }),

  /** Get current cart */
  getCart: () => call('get_cart', {}),

  /** Checkout and place order */
  checkout: (addressId) => call('checkout', { address_id: addressId }),

  /** Track an order */
  trackOrder: (orderId) => call('track_order', { order_id: orderId }),

  /** Get past orders */
  getOrders: (limit = 10) => call('get_orders', { limit }),
};

// ── Mock Dispatch ────────────────────────────────────────────────────────────

function mockDispatch(tool, params) {
  console.log(`[MOCK] ${tool}`, params);

  switch (tool) {
    case 'search_products':
      return mockSearchProducts(params.query);
    case 'update_cart':
      return { success: true, cart_item_id: `cart_${Date.now()}` };
    case 'get_cart':
      return mockGetCart();
    case 'checkout':
      return mockCheckout();
    case 'track_order':
      return mockTrackOrder(params.order_id);
    case 'get_orders':
      return mockGetOrders();
    default:
      throw new Error(`Unknown mock tool: ${tool}`);
  }
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_PRODUCTS = {
  milk: [
    { id: 'prod_001', name: 'Amul Toned Milk 1L', price: 62, unit: '1L', brand: 'Amul', in_stock: true },
    { id: 'prod_002', name: 'Nandini Full Cream Milk 500ml', price: 32, unit: '500ml', brand: 'Nandini', in_stock: true },
  ],
  eggs: [
    { id: 'prod_010', name: 'Farm Fresh White Eggs (12 pcs)', price: 89, unit: '12 pcs', brand: 'Farm Fresh', in_stock: true },
    { id: 'prod_011', name: 'Country Eggs Brown (6 pcs)', price: 54, unit: '6 pcs', brand: 'Organic', in_stock: true },
  ],
  bread: [
    { id: 'prod_020', name: 'Modern Sandwich Bread 400g', price: 45, unit: '400g', brand: 'Modern', in_stock: true },
    { id: 'prod_021', name: 'Britannia Whole Wheat Bread', price: 52, unit: '400g', brand: 'Britannia', in_stock: false },
  ],
  rice: [
    { id: 'prod_030', name: 'India Gate Basmati Rice 5kg', price: 495, unit: '5kg', brand: 'India Gate', in_stock: true },
  ],
  default: [
    { id: `prod_${Date.now()}`, name: `Generic ${Date.now()}`, price: 99, unit: '1 unit', brand: 'Generic', in_stock: true },
  ],
};

function mockSearchProducts(query) {
  const key = Object.keys(MOCK_PRODUCTS).find((k) =>
    query.toLowerCase().includes(k)
  ) ?? 'default';
  return { products: MOCK_PRODUCTS[key], query };
}

function mockGetCart() {
  return {
    items: [
      { product_id: 'prod_001', name: 'Amul Toned Milk 1L', quantity: 2, price: 62 },
    ],
    total: 124,
    currency: 'INR',
  };
}

function mockCheckout() {
  return {
    order_id: `ORD_${Date.now()}`,
    status: 'confirmed',
    estimated_delivery: '25-35 mins',
    total: 124,
    payment: 'COD',
  };
}

function mockTrackOrder(orderId) {
  const statuses = ['confirmed', 'packed', 'out_for_delivery', 'delivered'];
  return {
    order_id: orderId,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    rider: 'Ramesh K.',
    eta: '12 mins',
  };
}

function mockGetOrders() {
  return {
    orders: [
      { order_id: 'ORD_100', status: 'delivered', total: 245, placed_at: new Date(Date.now() - 7 * 86400000).toISOString() },
      { order_id: 'ORD_099', status: 'delivered', total: 178, placed_at: new Date(Date.now() - 14 * 86400000).toISOString() },
    ],
  };
}
