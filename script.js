(function initializeApplication() {
  "use strict";

  const inventoryTools = window.GinvenInventory;
  const exportTools = window.GinvenExport;

  const elements = {
    form: document.getElementById("inventory-form"),
    nameInput: document.getElementById("item-name"),
    quantityInput: document.getElementById("item-quantity"),
    addButton: document.getElementById("add-item-button"),
    formError: document.getElementById("form-error"),
    list: document.getElementById("inventory-list"),
    emptyState: document.getElementById("empty-state"),
    count: document.getElementById("inventory-count"),
    clearButton: document.getElementById("clear-inventory"),
    xlsxButton: document.getElementById("export-xlsx"),
    docxButton: document.getElementById("export-docx"),
    htmlButton: document.getElementById("export-html"),
    status: document.getElementById("status-message")
  };

  let inventory = [];
  let submitLocked = false;

  if (!inventoryTools || !exportTools) {
    showFatalError("Application modules failed to load. Refresh the page and try again.");
    return;
  }

  const stored = inventoryTools.loadInventory(window.localStorage);
  inventory = stored.items;
  renderInventory();

  if (stored.warning) {
    setStatus(stored.warning, "error");
  }

  elements.form.addEventListener("submit", handleSubmit);
  elements.list.addEventListener("click", handleListClick);
  elements.clearButton.addEventListener("click", handleClear);
  elements.xlsxButton.addEventListener("click", () => exportInventory("xlsx"));
  elements.docxButton.addEventListener("click", () => exportInventory("docx"));
  elements.htmlButton.addEventListener("click", () => exportInventory("html"));

  function handleSubmit(event) {
    event.preventDefault();

    if (submitLocked) {
      return;
    }

    submitLocked = true;
    elements.addButton.disabled = true;
    clearFormError();

    try {
      const parsed = inventoryTools.parseItemInput(elements.nameInput.value, elements.quantityInput.value);
      if (!parsed.ok) {
        showFormError(parsed.error, parsed.field);
        return;
      }

      const result = inventoryTools.addOrMerge(inventory, parsed.item);
      if (!result.ok) {
        showFormError(result.error, "quantity");
        return;
      }

      inventory = result.items;
      const saved = inventoryTools.saveInventory(window.localStorage, inventory);
      renderInventory();
      elements.form.reset();
      elements.nameInput.focus();

      if (!saved.ok) {
        setStatus("Item added, but this browser could not save it between sessions.", "error");
        return;
      }

      setStatus(result.merged ? "Matching item quantity updated." : "Item added.", "success");
    } finally {
      window.setTimeout(() => {
        submitLocked = false;
        elements.addButton.disabled = false;
      }, 250);
    }
  }

  function handleListClick(event) {
    const button = event.target.closest("button[data-item-id]");
    if (!button) {
      return;
    }

    inventory = inventoryTools.removeItem(inventory, button.dataset.itemId);
    const saved = inventoryTools.saveInventory(window.localStorage, inventory);
    renderInventory();

    setStatus(
      saved.ok ? "Item removed." : "Item removed, but saved inventory could not be updated.",
      saved.ok ? "success" : "error"
    );
  }

  function handleClear() {
    if (inventory.length === 0) {
      return;
    }

    const confirmed = window.confirm("Clear every inventory item? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    inventory = [];
    const cleared = inventoryTools.clearInventory(window.localStorage);
    renderInventory();
    setStatus(
      cleared.ok ? "Inventory cleared." : "Inventory cleared for this session, but saved data could not be removed.",
      cleared.ok ? "success" : "error"
    );
  }

  function renderInventory() {
    elements.list.replaceChildren();

    inventory.forEach((item) => {
      const row = document.createElement("li");
      row.className = "inventory-item";

      const copy = document.createElement("div");
      copy.className = "item-copy";

      const name = document.createElement("span");
      name.className = "item-name";
      name.textContent = item.name;

      const quantity = document.createElement("span");
      quantity.className = "item-quantity";
      quantity.textContent = `Quantity: ${item.quantity.toLocaleString("en-US")}`;

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "remove-item";
      removeButton.dataset.itemId = item.id;
      removeButton.textContent = "Remove";
      removeButton.setAttribute("aria-label", `Remove ${item.name}`);

      copy.append(name, quantity);
      row.append(copy, removeButton);
      elements.list.append(row);
    });

    const hasItems = inventory.length > 0;
    elements.emptyState.hidden = hasItems;
    elements.count.textContent = `${inventory.length} ${inventory.length === 1 ? "item" : "items"}`;
    elements.clearButton.disabled = !hasItems;
    elements.xlsxButton.disabled = !hasItems;
    elements.docxButton.disabled = !hasItems;
    elements.htmlButton.disabled = !hasItems;
  }

  function exportInventory(format) {
    if (inventory.length === 0) {
      setStatus("Add at least one item before exporting.", "error");
      return;
    }

    try {
      let blob;
      let extension;

      if (format === "xlsx") {
        blob = exportTools.createXlsxBlob(inventory);
        extension = "xlsx";
      } else if (format === "docx") {
        blob = exportTools.createDocxBlob(inventory);
        extension = "docx";
      } else if (format === "html") {
        blob = exportTools.createHtmlBlob(inventory);
        extension = "html";
      } else {
        throw new Error("Unsupported export format.");
      }

      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `inventory-${date}.${extension}`);
      setStatus(`${extension.toUpperCase()} export created.`, "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed.";
      setStatus(message, "error");
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();

    window.setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function showFormError(message, field) {
    elements.formError.textContent = message;
    elements.formError.hidden = false;

    const target = field === "name" ? elements.nameInput : elements.quantityInput;
    target.setAttribute("aria-invalid", "true");
    target.focus();
  }

  function clearFormError() {
    elements.formError.textContent = "";
    elements.formError.hidden = true;
    elements.nameInput.removeAttribute("aria-invalid");
    elements.quantityInput.removeAttribute("aria-invalid");
  }

  function setStatus(message, type) {
    elements.status.textContent = message;
    elements.status.classList.toggle("is-error", type === "error");
    elements.status.classList.toggle("is-success", type === "success");
  }

  function showFatalError(message) {
    document.body.replaceChildren();
    const error = document.createElement("p");
    error.setAttribute("role", "alert");
    error.textContent = message;
    document.body.append(error);
  }
}());
