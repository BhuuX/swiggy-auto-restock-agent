import { GoogleGenerativeAI } from '@google/generative-ai';
import { instamart } from '../api/instamart.js';
import { itemsRepo, ordersRepo, logsRepo } from '../db/store.js';
import { RESTOCK_SYSTEM_PROMPT, CART_REVIEW_PROMPT } from './prompts.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Tool definitions for Gemini ──────────────────────────────────────────────

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'search_instamart_product',
        description: 'Search for a grocery product on Swiggy Instamart by name',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'Product name to search for' },
            limit: { type: 'NUMBER', description: 'Max results to return' },
          },
          required: ['query'],
        },
      },
      {
        name: 'add_to_cart',
        description: 'Add a specific product to the Instamart cart',
        parameters: {
          type: 'OBJECT',
          properties: {
            product_id: { type: 'STRING', description: 'Swiggy product ID' },
            quantity: { type: 'NUMBER', description: 'Quantity to add' },
          },
          required: ['product_id', 'quantity'],
        },
      },
      {
        name: 'get_cart',
        description: 'Get the current state of the Instamart cart',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'place_order',
        description: 'Checkout and place the Instamart order',
        parameters: {
          type: 'OBJECT',
          properties: {
            address_id: { type: 'STRING', description: 'Delivery address ID' },
          },
        },
      },
    ],
  },
];

// ── Tool executor ────────────────────────────────────────────────────────────

async function executeTool(name, input) {
  switch (name) {
    case 'search_instamart_product':
      return instamart.searchProducts(input.query, input.limit);
    case 'add_to_cart':
      return instamart.updateCart(input.product_id, input.quantity);
    case 'get_cart':
      return instamart.getCart();
    case 'place_order':
      return instamart.checkout(input.address_id || 'default');
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── Agentic loop (Gemini) ────────────────────────────────────────────────────

async function runAgentLoop(userMessage, maxIterations = 10) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: RESTOCK_SYSTEM_PROMPT,
    tools: TOOLS,
  });

  const chat = model.startChat({ history: [] });
  const toolResults = [];

  // Send initial message
  let response = await chat.sendMessage(userMessage);
  let result = response.response;

  for (let i = 0; i < maxIterations; i++) {
    // Add a small delay to avoid hitting rate limits on the free tier
    await new Promise(resolve => setTimeout(resolve, 2000));
    const candidate = result.candidates?.[0];
    if (!candidate) break;

    const parts = candidate.content?.parts || [];

    // Check if there are function calls
    const functionCalls = parts.filter((p) => p.functionCall);

    if (functionCalls.length === 0) {
      // No more tool calls — extract final text
      const textPart = parts.find((p) => p.text);
      return { result: textPart?.text || '', toolResults };
    }

    // Execute all function calls in parallel
    const functionResponses = await Promise.all(
      functionCalls.map(async (part) => {
        const { name, args } = part.functionCall;
        logsRepo.add('tool_call', { tool: name, input: args });
        let output;
        try {
          output = await executeTool(name, args);
          toolResults.push({ tool: name, output });
        } catch (err) {
          output = { error: err.message };
        }
        return {
          functionResponse: {
            name,
            response: output,
          },
        };
      })
    );

    // Send function responses back to Gemini
    response = await chat.sendMessage(functionResponses);
    result = response.response;
  }

  throw new Error('Agent exceeded max iterations');
}

// ── Public Agent Interface ────────────────────────────────────────────────────

export const restockAgent = {
  /**
   * Main trigger — run the restock cycle for all due items
   */
  async runRestockCycle(triggeredBy = 'scheduler') {
    const dueItems = itemsRepo.getDueForRestock();

    if (dueItems.length === 0) {
      logsRepo.add('restock_cycle', { status: 'nothing_due' });
      return { status: 'nothing_due', items: [] };
    }

    logsRepo.add('restock_cycle_start', { items: dueItems.map((i) => i.name), triggeredBy });

    const prompt = `
Run a restock cycle for these household items that are due:

${JSON.stringify(dueItems, null, 2)}

Steps:
1. For each item, search for it on Instamart
2. Pick the best available product (in-stock, good brand)
3. Add each one to the cart with the correct quantity
4. Get the final cart to confirm totals
5. Place the order

Then summarise what was ordered and the total cost.
    `.trim();

    try {
      const { result, toolResults } = await runAgentLoop(prompt);

      // Extract order info from tool results
      const checkoutResult = toolResults.find((r) => r.tool === 'place_order')?.output;

      if (checkoutResult?.order_id) {
        const orderedItems = dueItems.map((i) => i.name);

        // Save order to DB
        const orderId = ordersRepo.create({
          swiggy_order_id: checkoutResult.order_id,
          items: orderedItems,
          status: checkoutResult.status,
          triggered_by: triggeredBy,
          total_amount: checkoutResult.total,
        });

        // Mark each item as ordered
        dueItems.forEach((item) => itemsRepo.markOrdered(item.id));

        logsRepo.add('restock_cycle_complete', {
          order_id: checkoutResult.order_id,
          items: orderedItems,
          total: checkoutResult.total,
        });

        return {
          status: 'ordered',
          order_id: checkoutResult.order_id,
          items: orderedItems,
          total: checkoutResult.total,
          summary: result,
        };
      }

      return { status: 'completed_no_order', summary: result };
    } catch (err) {
      logsRepo.add('restock_cycle_error', { error: err.message });
      throw err;
    }
  },

  /**
   * Manual restock for a specific item
   */
  async restockItem(itemId) {
    const item = itemsRepo.getById(itemId);
    if (!item) throw new Error(`Item ${itemId} not found`);

    const prompt = `
Restock this single item:
${JSON.stringify(item, null, 2)}

Search for it, add the right quantity to cart, then place the order.
    `.trim();

    return runAgentLoop(prompt);
  },

  /**
   * Ask Gemini to analyse order patterns and suggest better frequencies
   */
  async analysePatterns() {
    const orders = ordersRepo.getAll().slice(0, 20);
    const items = itemsRepo.getAll();

    const prompt = `
Analyse the order history and current household items.
Suggest optimised restock frequencies and quantities based on patterns.

Items: ${JSON.stringify(items)}
Order history: ${JSON.stringify(orders)}

For each item, suggest the ideal frequency_days and quantity.
    `.trim();

    const { result } = await runAgentLoop(prompt);
    return result;
  },

  /**
   * Chat interface — ask the agent anything
   */
  async chat(message) {
    const context = `
Current household items: ${JSON.stringify(itemsRepo.getAll())}
Recent orders: ${JSON.stringify(ordersRepo.getAll().slice(0, 5))}

User message: ${message}
    `.trim();

    const { result } = await runAgentLoop(context);
    return result;
  },
};
