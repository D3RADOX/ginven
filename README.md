# Ginven Inventory Exporter

Ginven is a static, browser-based inventory tool. It validates entries, merges duplicate item names, saves data on the current device, and creates genuine XLSX, DOCX, and HTML downloads.

## Production decisions

- Runtime: vanilla HTML, CSS, and JavaScript with no external runtime libraries.
- Duplicate handling: matching names merge case-insensitively and their quantities are added.
- Item names: 1–120 normalized characters.
- Quantities: whole numbers from 1 through 1,000,000,000.
- Persistence: versioned `localStorage`; unreadable data is preserved under a recovery key before reset.
- Privacy: inventory data stays in the browser and is never transmitted by this application.
- Exports: Office Open XML packages are created locally with text-only item cells to prevent spreadsheet formulas and markup execution.

## Run locally

```bash
npm install
npm start
```

Open `http://127.0.0.1:4173`.

## Validation

Install the pinned Python validation packages:

```bash
python3 -m pip install -r requirements-dev.txt
```

Run static checks, unit tests, and real Office-file parsing:

```bash
npm run validate
```

Install browser engines once, then run the cross-browser suite:

```bash
npx playwright install chromium firefox webkit
npm run test:e2e
```

The browser matrix covers Chromium (the Chrome/Edge engine), Firefox, WebKit (the Safari engine), and a mobile Chromium viewport. GitHub Actions repeats the complete matrix for pushes and pull requests.

## Deployment

The project has no build step. Serve the repository root over HTTPS; `index.html` is the deployment entry point.

## Recovery and limits

- Clearing browser site data removes the saved inventory.
- Private browsing or restricted storage may prevent persistence; the active session can still be exported.
- Corrupt saved data is copied to `ginven.inventory.recovery` before the active list resets.
- Export buttons stay disabled until at least one valid item exists.
