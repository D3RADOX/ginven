(function initializeInventoryModule(root, factory) {
  "use strict";

  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.GinvenInventory = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function createInventoryModule() {
  "use strict";

  const STORAGE_KEY = "ginven.inventory.v1";
  const RECOVERY_KEY = "ginven.inventory.recovery";
  const STORAGE_VERSION = 1;
  const MAX_NAME_LENGTH = 120;
  const MAX_QUANTITY = 1000000000;

  function createId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeName(value) {
    if (typeof value !== "string") {
      return "";
    }

    return value
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseItemInput(rawName, rawQuantity) {
    const name = normalizeName(rawName);

    if (!name) {
      return { ok: false, field: "name", error: "Enter an item name." };
    }

    if (name.length > MAX_NAME_LENGTH) {
      return {
        ok: false,
        field: "name",
        error: `Item names must be ${MAX_NAME_LENGTH} characters or fewer.`
      };
    }

    const quantityText = String(rawQuantity ?? "").trim();
    if (!/^\d+$/.test(quantityText)) {
      return { ok: false, field: "quantity", error: "Quantity must be a whole number." };
    }

    const quantity = Number(quantityText);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return {
        ok: false,
        field: "quantity",
        error: `Quantity must be between 1 and ${MAX_QUANTITY.toLocaleString("en-US")}.`
      };
    }

    return {
      ok: true,
      item: {
        id: createId(),
        name,
        quantity
      }
    };
  }

  function normalizeStoredItem(value) {
    if (!value || typeof value !== "object") {
      return null;
    }

    const parsed = parseItemInput(value.name, value.quantity);
    if (!parsed.ok) {
      return null;
    }

    return {
      id: typeof value.id === "string" && value.id.trim() ? value.id : parsed.item.id,
      name: parsed.item.name,
      quantity: parsed.item.quantity
    };
  }

  function itemKey(name) {
    return normalizeName(name).toLocaleLowerCase("en-US");
  }

  function addOrMerge(items, newItem) {
    const safeItem = normalizeStoredItem(newItem);
    if (!safeItem) {
      return { ok: false, error: "The item is invalid.", items: [...items] };
    }

    const nextItems = items.map((item) => ({ ...item }));
    const existingIndex = nextItems.findIndex((item) => itemKey(item.name) === itemKey(safeItem.name));

    if (existingIndex === -1) {
      nextItems.push(safeItem);
      return { ok: true, merged: false, items: nextItems, item: safeItem };
    }

    const total = nextItems[existingIndex].quantity + safeItem.quantity;
    if (!Number.isSafeInteger(total) || total > MAX_QUANTITY) {
      return {
        ok: false,
        error: `Combined quantity cannot exceed ${MAX_QUANTITY.toLocaleString("en-US")}.`,
        items: nextItems
      };
    }

    nextItems[existingIndex] = {
      ...nextItems[existingIndex],
      quantity: total
    };

    return {
      ok: true,
      merged: true,
      items: nextItems,
      item: nextItems[existingIndex]
    };
  }

  function cleanInventory(value) {
    if (!Array.isArray(value)) {
      return { items: [], discarded: 1 };
    }

    let items = [];
    let discarded = 0;

    value.forEach((candidate) => {
      const safeItem = normalizeStoredItem(candidate);
      if (!safeItem) {
        discarded += 1;
        return;
      }

      const result = addOrMerge(items, safeItem);
      if (!result.ok) {
        discarded += 1;
        return;
      }

      items = result.items;
    });

    return { items, discarded };
  }

  function saveInventory(storage, items) {
    try {
      const cleaned = cleanInventory(items);
      const payload = {
        version: STORAGE_VERSION,
        savedAt: new Date().toISOString(),
        items: cleaned.items
      };
      storage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return { ok: true, items: cleaned.items };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Inventory storage failed."
      };
    }
  }

  function recoverMalformedStorage(storage, rawValue) {
    try {
      storage.setItem(RECOVERY_KEY, rawValue);
      storage.removeItem(STORAGE_KEY);
    } catch {
      // The application can still recover in memory when storage is unavailable.
    }
  }

  function loadInventory(storage) {
    let rawValue;

    try {
      rawValue = storage.getItem(STORAGE_KEY);
    } catch {
      return {
        items: [],
        warning: "Saved inventory could not be accessed. This session will remain available for export."
      };
    }

    if (!rawValue) {
      return { items: [] };
    }

    try {
      const payload = JSON.parse(rawValue);
      if (!payload || payload.version !== STORAGE_VERSION || !Array.isArray(payload.items)) {
        throw new Error("Unsupported inventory data.");
      }

      const cleaned = cleanInventory(payload.items);
      if (cleaned.discarded > 0) {
        saveInventory(storage, cleaned.items);
      }

      return {
        items: cleaned.items,
        warning: cleaned.discarded > 0
          ? `${cleaned.discarded} invalid saved item${cleaned.discarded === 1 ? " was" : "s were"} removed.`
          : ""
      };
    } catch {
      recoverMalformedStorage(storage, rawValue);
      return {
        items: [],
        recovered: true,
        warning: "Unreadable saved inventory was preserved for recovery and the active list was reset."
      };
    }
  }

  function removeItem(items, id) {
    return items.filter((item) => item.id !== id);
  }

  function clearInventory(storage) {
    try {
      storage.removeItem(STORAGE_KEY);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Inventory storage could not be cleared."
      };
    }
  }

  return Object.freeze({
    STORAGE_KEY,
    RECOVERY_KEY,
    STORAGE_VERSION,
    MAX_NAME_LENGTH,
    MAX_QUANTITY,
    normalizeName,
    parseItemInput,
    addOrMerge,
    cleanInventory,
    saveInventory,
    loadInventory,
    removeItem,
    clearInventory
  });
}));
