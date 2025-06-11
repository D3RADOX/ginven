const inventory = [];

document.getElementById("inventory-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const name = document.getElementById("item-name").value.trim();
  const qty = parseInt(document.getElementById("item-quantity").value.trim(), 10);
  if (!name || isNaN(qty)) return;

  inventory.push({ name, quantity: qty });
  updateList();
  this.reset();
});

function updateList() {
  const list = document.getElementById("inventory-list");
  list.innerHTML = "";
  inventory.forEach((item, index) => {
    const li = document.createElement("li");
    li.textContent = `${item.name} — ${item.quantity}`;
    list.appendChild(li);
  });
}

function exportAsExcel() {
  let content = `<table><tr><th>Item</th><th>Quantity</th></tr>`;
  inventory.forEach(i => {
    content += `<tr><td>${i.name}</td><td>${i.quantity}</td></tr>`;
  });
  content += `</table>`;
  const html = `
    <html><head><meta charset="UTF-8"></head>
    <body>${content}</body></html>
  `;
  download(html, "inventory.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

function exportAsDoc() {
  let docContent = `<h1>Inventory Report</h1><table border="1" cellpadding="6"><tr><th>Item</th><th>Quantity</th></tr>`;
  inventory.forEach(i => {
    docContent += `<tr><td>${i.name}</td><td>${i.quantity}</td></tr>`;
  });
  docContent += `</table>`;
  const html = `<html><head><meta charset="UTF-8"></head><body>${docContent}</body></html>`;
  download(html, "inventory.doc", "application/msword");
}

function exportAsHTML() {
  let html = `<h1>Inventory Snapshot</h1><ul>`;
  inventory.forEach(i => {
    html += `<li>${i.name}: ${i.quantity}</li>`;
  });
  html += `</ul>`;
  const wrapped = `<html><head><meta charset="UTF-8"></head><body>${html}</body></html>`;
  download(wrapped, "inventory.html", "text/html");
}

function download(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}