"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const inventoryTools = require("../inventory.js");

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

test("parses and normalizes a valid item", () => {
  const result = inventoryTools.parseItemInput("  Blue   widget  ", "12");

  assert.equal(result.ok, true);
  assert.equal(result.item.name, "Blue widget");
  assert.equal(result.item.quantity, 12);
  assert.ok(result.item.id);
});

test("rejects invalid quantities and blank names", () => {
  assert.equal(inventoryTools.parseItemInput("", "1").ok, false);
  assert.equal(inventoryTools.parseItemInput("Widget", "0").ok, false);
  assert.equal(inventoryTools.parseItemInput("Widget", "-1").ok, false);
  assert.equal(inventoryTools.parseItemInput("Widget", "1.5").ok, false);
  assert.equal(inventoryTools.parseItemInput("Widget", "1e3").ok, false);
  assert.equal(inventoryTools.parseItemInput("Widget", "Infinity").ok, false);
});

test("merges duplicate names case-insensitively", () => {
  const first = inventoryTools.parseItemInput("Widget", "2").item;
  const second = inventoryTools.parseItemInput("widget", "3").item;
  const initial = inventoryTools.addOrMerge([], first);
  const merged = inventoryTools.addOrMerge(initial.items, second);

  assert.equal(merged.ok, true);
  assert.equal(merged.merged, true);
  assert.equal(merged.items.length, 1);
  assert.equal(merged.items[0].name, "Widget");
  assert.equal(merged.items[0].quantity, 5);
});

test("prevents merged quantities from exceeding the limit", () => {
  const first = inventoryTools.parseItemInput("Widget", String(inventoryTools.MAX_QUANTITY)).item;
  const second = inventoryTools.parseItemInput("widget", "1").item;
  const initial = inventoryTools.addOrMerge([], first);
  const merged = inventoryTools.addOrMerge(initial.items, second);

  assert.equal(merged.ok, false);
  assert.match(merged.error, /cannot exceed/i);
  assert.equal(merged.items[0].quantity, inventoryTools.MAX_QUANTITY);
});

test("saves and restores a versioned inventory", () => {
  const storage = new MemoryStorage();
  const item = inventoryTools.parseItemInput("Cable & adapter", "4").item;
  const saved = inventoryTools.saveInventory(storage, [item]);
  const loaded = inventoryTools.loadInventory(storage);

  assert.equal(saved.ok, true);
  assert.deepEqual(loaded.items, [item]);
  assert.equal(loaded.warning, "");
});

test("preserves malformed storage for recovery before resetting", () => {
  const storage = new MemoryStorage();
  const malformed = "{not-json";
  storage.setItem(inventoryTools.STORAGE_KEY, malformed);

  const loaded = inventoryTools.loadInventory(storage);

  assert.equal(loaded.recovered, true);
  assert.deepEqual(loaded.items, []);
  assert.equal(storage.getItem(inventoryTools.RECOVERY_KEY), malformed);
  assert.equal(storage.getItem(inventoryTools.STORAGE_KEY), null);
});

test("removes invalid saved items while retaining valid data", () => {
  const storage = new MemoryStorage();
  storage.setItem(inventoryTools.STORAGE_KEY, JSON.stringify({
    version: inventoryTools.STORAGE_VERSION,
    items: [
      { id: "valid", name: "Valid item", quantity: 2 },
      { id: "invalid", name: "", quantity: -1 }
    ]
  }));

  const loaded = inventoryTools.loadInventory(storage);

  assert.equal(loaded.items.length, 1);
  assert.equal(loaded.items[0].name, "Valid item");
  assert.match(loaded.warning, /1 invalid saved item was removed/i);
});
