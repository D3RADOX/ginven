"use strict";

const fs = require("node:fs");
const { expect, test } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

async function addItem(page, name, quantity) {
  await page.getByLabel("Item name").fill(name);
  await page.getByLabel("Quantity").fill(String(quantity));
  await page.getByRole("button", { name: "Add item" }).click();
}

test("loads the stylesheet and supports persistent inventory management", async ({ page }) => {
  await expect(page.locator(".panel").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");

  await addItem(page, "Blue widget", 2);
  await expect(page.getByText("Blue widget", { exact: true })).toBeVisible();
  await expect(page.getByText("Quantity: 2", { exact: true })).toBeVisible();
  await expect(page.locator("#inventory-count")).toHaveText("1 item");

  await page.reload();
  await expect(page.getByText("Blue widget", { exact: true })).toBeVisible();
  await expect(page.getByText("Quantity: 2", { exact: true })).toBeVisible();

  await addItem(page, "blue WIDGET", 3);
  await expect(page.locator("#inventory-list li")).toHaveCount(1);
  await expect(page.getByText("Quantity: 5", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Remove Blue widget" }).click();
  await expect(page.locator("#inventory-list li")).toHaveCount(0);
  await expect(page.getByText("No items yet.", { exact: false })).toBeVisible();
});

test("rejects invalid input with visible field feedback", async ({ page }) => {
  await page.getByLabel("Item name").fill("Widget");
  await page.getByLabel("Quantity").fill("1.5");
  await page.getByRole("button", { name: "Add item" }).click();

  await expect(page.getByRole("alert")).toContainText("whole number");
  await expect(page.getByLabel("Quantity")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#inventory-list li")).toHaveCount(0);
});

test("recovers malformed local storage safely", async ({ page }) => {
  await page.evaluate(() => {
    window.localStorage.setItem("ginven.inventory.v1", "{not-json");
  });
  await page.reload();

  await expect(page.getByRole("status")).toContainText("preserved for recovery");
  const recovery = await page.evaluate(() => window.localStorage.getItem("ginven.inventory.recovery"));
  expect(recovery).toBe("{not-json");
});

test("creates safe XLSX, DOCX, and HTML downloads", async ({ page }) => {
  const payload = "=2+2 <img src=x onerror=alert(1)> & bolts";
  await addItem(page, payload, 7);

  const xlsxDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Excel (.xlsx)" }).click();
  const xlsxDownload = await xlsxDownloadPromise;
  const xlsxPath = await xlsxDownload.path();
  const xlsx = fs.readFileSync(xlsxPath);
  expect(xlsx.subarray(0, 4).toString("hex")).toBe("504b0304");
  expect(xlsxDownload.suggestedFilename()).toMatch(/^inventory-\d{4}-\d{2}-\d{2}\.xlsx$/);

  const docxDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Word (.docx)" }).click();
  const docxDownload = await docxDownloadPromise;
  const docxPath = await docxDownload.path();
  const docx = fs.readFileSync(docxPath);
  expect(docx.subarray(0, 4).toString("hex")).toBe("504b0304");
  expect(docxDownload.suggestedFilename()).toMatch(/^inventory-\d{4}-\d{2}-\d{2}\.docx$/);

  const htmlDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Web page (.html)" }).click();
  const htmlDownload = await htmlDownloadPromise;
  const htmlPath = await htmlDownload.path();
  const html = fs.readFileSync(htmlPath, "utf8");
  expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  expect(html).not.toContain("<img src=x");
  expect(html).not.toContain("<script");
});

test("clear requires confirmation and removes persisted data", async ({ page }) => {
  await addItem(page, "Cable", 2);

  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Clear inventory" }).click();
  await expect(page.locator("#inventory-list li")).toHaveCount(1);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear inventory" }).click();
  await expect(page.locator("#inventory-list li")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("#inventory-list li")).toHaveCount(0);
});

test("layout has no horizontal overflow and controls meet touch size", async ({ page }) => {
  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    buttonHeights: Array.from(document.querySelectorAll("button")).map((button) => (
      button.getBoundingClientRect().height
    ))
  }));

  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  metrics.buttonHeights.forEach((height) => expect(height).toBeGreaterThanOrEqual(44));
});
