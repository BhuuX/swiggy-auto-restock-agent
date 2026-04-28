/**
 * Seed script — populates the DB with common household items
 * Run with: node scripts/seed.js
 */

import 'dotenv/config';
import { itemsRepo } from '../src/db/store.js';

const ITEMS = [
  { name: 'Milk',        quantity: 2, unit: 'L',    frequency_days: 3  },
  { name: 'Eggs',        quantity: 12, unit: 'pcs', frequency_days: 7  },
  { name: 'Bread',       quantity: 1, unit: 'loaf', frequency_days: 5  },
  { name: 'Rice',        quantity: 5, unit: 'kg',   frequency_days: 30 },
  { name: 'Dal',         quantity: 1, unit: 'kg',   frequency_days: 21 },
  { name: 'Onions',      quantity: 2, unit: 'kg',   frequency_days: 14 },
  { name: 'Tomatoes',    quantity: 1, unit: 'kg',   frequency_days: 7  },
  { name: 'Cooking Oil', quantity: 1, unit: 'L',    frequency_days: 30 },
  { name: 'Sugar',       quantity: 1, unit: 'kg',   frequency_days: 30 },
  { name: 'Tea',         quantity: 1, unit: 'pack', frequency_days: 14 },
];

for (const item of ITEMS) {
  itemsRepo.upsert({
    ...item,
    product_id: null,
    next_restock_at: new Date().toISOString(), // all due immediately
  });
}

console.log(`✅ Seeded ${ITEMS.length} household items`);
process.exit(0);
