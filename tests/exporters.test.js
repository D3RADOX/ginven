"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const exportTools = require("../exporters.js");

const dangerousName = "=2+2 <img src=x onerror=alert(1)> & bolts";
const inventory = [{ id: "fixture", name: dangerousName, quantity: 7 }];

function readStoredZipEntries(arrayBuffer) {
  const buffer = Buffer.from(arrayBuffer);
  const entries = new Map();
  let offset = 0;

  while (offset + 4 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const filenameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const filenameStart = offset + 30;
    const dataStart = filenameStart + filenameLength + extraLength;
    const filename = buffer.subarray(filenameStart, filenameStart + filenameLength).toString("utf8");

    assert.equal(method, 0, "test reader expects uncompressed ZIP entries");
    entries.set(filename, buffer.subarray(dataStart, dataStart + compressedSize));
    offset = dataStart + compressedSize;
  }

  return entries;
}

test("creates a genuine XLSX ZIP package with text-only item cells", async () => {
  const blob = exportTools.createXlsxBlob(inventory);
  const entries = readStoredZipEntries(await blob.arrayBuffer());

  assert.equal(blob.type, exportTools.XLSX_MIME);
  assert.ok(entries.has("[Content_Types].xml"));
  assert.ok(entries.has("xl/workbook.xml"));
  assert.ok(entries.has("xl/worksheets/sheet1.xml"));

  const worksheet = entries.get("xl/worksheets/sheet1.xml").toString("utf8");
  assert.match(worksheet, /t="inlineStr"/);
  assert.match(worksheet, /=2\+2 &lt;img/);
  assert.doesNotMatch(worksheet, /<f>/);
  assert.doesNotMatch(worksheet, /<img/);
});

test("creates a genuine DOCX ZIP package with escaped document text", async () => {
  const blob = exportTools.createDocxBlob(inventory);
  const entries = readStoredZipEntries(await blob.arrayBuffer());

  assert.equal(blob.type, exportTools.DOCX_MIME);
  assert.ok(entries.has("[Content_Types].xml"));
  assert.ok(entries.has("word/document.xml"));

  const documentXml = entries.get("word/document.xml").toString("utf8");
  assert.match(documentXml, /=2\+2 &lt;img/);
  assert.doesNotMatch(documentXml, /<img/);
});

test("creates a complete HTML document without executable item markup", () => {
  const html = exportTools.buildHtmlDocument(inventory);

  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(html, /<script/);
});

test("refuses empty and malformed exports", () => {
  assert.throws(() => exportTools.createXlsxBlob([]), /at least one/i);
  assert.throws(() => exportTools.createDocxBlob([{ name: "", quantity: 1 }]), /invalid item/i);
  assert.throws(() => exportTools.createHtmlBlob([{ name: "Widget", quantity: 1.5 }]), /invalid item/i);
});
