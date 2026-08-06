"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const exportTools = require("../exporters.js");

const outputDirectory = path.join(__dirname, "output");
const inventory = [
  { id: "one", name: "=2+2 <bolts> & washers", quantity: 7 },
  { id: "two", name: "Cable bundle", quantity: 12 }
];

async function writeBlob(filename, blob) {
  const bytes = Buffer.from(await blob.arrayBuffer());
  await fs.writeFile(path.join(outputDirectory, filename), bytes);
}

async function generate() {
  await fs.mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeBlob("inventory.xlsx", exportTools.createXlsxBlob(inventory)),
    writeBlob("inventory.docx", exportTools.createDocxBlob(inventory)),
    writeBlob("inventory.html", exportTools.createHtmlBlob(inventory))
  ]);
}

generate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
