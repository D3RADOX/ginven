const inventory = [];

function addItem() {
  const name = document.getElementById("itemName").value.trim();
  const qty = parseInt(document.getElementById("itemQty").value, 10);

  if (!name || isNaN(qty) || qty < 0) {
    alert("Enter valid item and quantity.");
    return;
  }

  inventory.push({ name, qty });
  document.getElementById("itemName").value = "";
  document.getElementById("itemQty").value = "";
  document.getElementById("itemName").focus();

  renderList();
}

function renderList() {
  const list = document.getElementById("inventoryList");
  list.innerHTML = "";

  inventory.forEach((item, index) => {
    const li = document.createElement("li");
    li.innerHTML = `${item.name} x${item.qty} 
      <button onclick="removeItem(${index})">🗑️</button>`;
    list.appendChild(li);
  });
}

function removeItem(index) {
  inventory.splice(index, 1);
  renderList();
}

function exportCSV() {
  if (inventory.length === 0) {
    alert("No items to export.");
    return;
  }

  let csv = "Item,Quantity\n";
  inventory.forEach(item => {
    csv += `${item.name},${item.qty}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "inventory.csv";
  link.click();
}
