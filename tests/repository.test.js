"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("every local HTML resource exists", () => {
  const resources = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((resource) => !/^(?:[a-z]+:|#|\/\/)/i.test(resource));

  assert.ok(resources.includes("styles.css"));
  resources.forEach((resource) => {
    assert.equal(fs.existsSync(path.join(root, resource)), true, `missing resource: ${resource}`);
  });
});

test("HTML avoids inline JavaScript handlers", () => {
  assert.doesNotMatch(html, /\son[a-z]+=/i);
});

test("deployment entry point loads application modules in order", () => {
  const inventoryIndex = html.indexOf("inventory.js");
  const exportersIndex = html.indexOf("exporters.js");
  const applicationIndex = html.indexOf("script.js");

  assert.ok(inventoryIndex > -1);
  assert.ok(exportersIndex > inventoryIndex);
  assert.ok(applicationIndex > exportersIndex);
});
