(function initializeExportModule(root, factory) {
  "use strict";

  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.GinvenExport = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function createExportModule() {
  "use strict";

  const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const HTML_MIME = "text/html;charset=utf-8";
  const encoder = new TextEncoder();

  const crcTable = (() => {
    const table = new Uint32Array(256);

    for (let index = 0; index < table.length; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
      }
      table[index] = value >>> 0;
    }

    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;

    for (const byte of bytes) {
      crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
  }

  function zipTimestamp(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    return {
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
      date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    };
  }

  function concatenate(parts) {
    const totalLength = parts.reduce((total, part) => total + part.length, 0);
    const output = new Uint8Array(totalLength);
    let offset = 0;

    parts.forEach((part) => {
      output.set(part, offset);
      offset += part.length;
    });

    return output;
  }

  function createZip(entries, mimeType) {
    const localParts = [];
    const centralParts = [];
    const timestamp = zipTimestamp();
    let localOffset = 0;

    entries.forEach((entry) => {
      const filename = encoder.encode(entry.name);
      const data = typeof entry.content === "string" ? encoder.encode(entry.content) : entry.content;
      const checksum = crc32(data);

      const localHeader = new Uint8Array(30 + filename.length);
      const localView = new DataView(localHeader.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0x0800, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, timestamp.time, true);
      localView.setUint16(12, timestamp.date, true);
      localView.setUint32(14, checksum, true);
      localView.setUint32(18, data.length, true);
      localView.setUint32(22, data.length, true);
      localView.setUint16(26, filename.length, true);
      localView.setUint16(28, 0, true);
      localHeader.set(filename, 30);

      const centralHeader = new Uint8Array(46 + filename.length);
      const centralView = new DataView(centralHeader.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0x0800, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, timestamp.time, true);
      centralView.setUint16(14, timestamp.date, true);
      centralView.setUint32(16, checksum, true);
      centralView.setUint32(20, data.length, true);
      centralView.setUint32(24, data.length, true);
      centralView.setUint16(28, filename.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, localOffset, true);
      centralHeader.set(filename, 46);

      localParts.push(localHeader, data);
      centralParts.push(centralHeader);
      localOffset += localHeader.length + data.length;
    });

    const centralDirectory = concatenate(centralParts);
    const endRecord = new Uint8Array(22);
    const endView = new DataView(endRecord.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, entries.length, true);
    endView.setUint16(10, entries.length, true);
    endView.setUint32(12, centralDirectory.length, true);
    endView.setUint32(16, localOffset, true);
    endView.setUint16(20, 0, true);

    return new Blob([
      concatenate(localParts),
      centralDirectory,
      endRecord
    ], { type: mimeType });
  }

  function validXmlCharacters(value) {
    return Array.from(String(value)).filter((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint === 0x09
        || codePoint === 0x0a
        || codePoint === 0x0d
        || (codePoint >= 0x20 && codePoint <= 0xd7ff)
        || (codePoint >= 0xe000 && codePoint <= 0xfffd)
        || (codePoint >= 0x10000 && codePoint <= 0x10ffff);
    }).join("");
  }

  function escapeXml(value) {
    return validXmlCharacters(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Add at least one inventory item before exporting.");
    }

    return items.map((item) => {
      const name = typeof item.name === "string" ? item.name.trim() : "";
      const quantity = Number(item.quantity);

      if (!name || !Number.isSafeInteger(quantity) || quantity < 1) {
        throw new Error("Inventory contains an invalid item.");
      }

      return { name, quantity };
    });
  }

  function inlineStringCell(reference, value, style = 0) {
    const styleAttribute = style ? ` s="${style}"` : "";
    return `<c r="${reference}" t="inlineStr"${styleAttribute}><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
  }

  function numberCell(reference, value) {
    return `<c r="${reference}" t="n"><v>${value}</v></c>`;
  }

  function createXlsxBlob(items) {
    const safeItems = normalizeItems(items);
    const rows = [
      `<row r="1">${inlineStringCell("A1", "Item", 1)}${inlineStringCell("B1", "Quantity", 1)}</row>`,
      ...safeItems.map((item, index) => {
        const row = index + 2;
        return `<row r="${row}">${inlineStringCell(`A${row}`, item.name)}${numberCell(`B${row}`, item.quantity)}</row>`;
      })
    ].join("");

    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

    const packageRelationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

    const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Inventory" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

    const workbookRelationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

    const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:B${safeItems.length + 1}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols><col min="1" max="1" width="42" customWidth="1"/><col min="2" max="2" width="14" customWidth="1"/></cols>
  <sheetData>${rows}</sheetData>
</worksheet>`;

    return createZip([
      { name: "[Content_Types].xml", content: contentTypes },
      { name: "_rels/.rels", content: packageRelationships },
      { name: "xl/workbook.xml", content: workbook },
      { name: "xl/_rels/workbook.xml.rels", content: workbookRelationships },
      { name: "xl/styles.xml", content: styles },
      { name: "xl/worksheets/sheet1.xml", content: worksheet }
    ], XLSX_MIME);
  }

  function wordRun(value, bold = false, size = 22) {
    const formatting = `<w:rPr>${bold ? "<w:b/>" : ""}<w:sz w:val="${size}"/></w:rPr>`;
    return `<w:r>${formatting}<w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r>`;
  }

  function tableCell(value, bold = false) {
    return `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr><w:p>${wordRun(value, bold)}</w:p></w:tc>`;
  }

  function createDocxBlob(items) {
    const safeItems = normalizeItems(items);
    const rows = [
      `<w:tr><w:trPr><w:tblHeader/></w:trPr>${tableCell("Item", true)}${tableCell("Quantity", true)}</w:tr>`,
      ...safeItems.map((item) => `<w:tr>${tableCell(item.name)}${tableCell(item.quantity)}</w:tr>`)
    ].join("");

    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

    const packageRelationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>${wordRun("Inventory Report", true, 32)}</w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="0" w:type="auto"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:color="B8C0CC"/>
          <w:left w:val="single" w:sz="4" w:color="B8C0CC"/>
          <w:bottom w:val="single" w:sz="4" w:color="B8C0CC"/>
          <w:right w:val="single" w:sz="4" w:color="B8C0CC"/>
          <w:insideH w:val="single" w:sz="4" w:color="D0D5DD"/>
          <w:insideV w:val="single" w:sz="4" w:color="D0D5DD"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid><w:gridCol w:w="7200"/><w:gridCol w:w="1800"/></w:tblGrid>
      ${rows}
    </w:tbl>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    return createZip([
      { name: "[Content_Types].xml", content: contentTypes },
      { name: "_rels/.rels", content: packageRelationships },
      { name: "word/document.xml", content: documentXml }
    ], DOCX_MIME);
  }

  function buildHtmlDocument(items) {
    const safeItems = normalizeItems(items);
    const rows = safeItems.map((item) => (
      `<tr><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td></tr>`
    )).join("");

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inventory Report</title>
  <style>
    body{max-width:800px;margin:40px auto;padding:0 20px;color:#172033;font-family:Arial,sans-serif}
    table{width:100%;border-collapse:collapse}th,td{padding:10px;border:1px solid #b8c0cc;text-align:left}
    th{background:#eef2f7}
  </style>
</head>
<body>
  <h1>Inventory Report</h1>
  <table>
    <thead><tr><th scope="col">Item</th><th scope="col">Quantity</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
  }

  function createHtmlBlob(items) {
    return new Blob([buildHtmlDocument(items)], { type: HTML_MIME });
  }

  return Object.freeze({
    XLSX_MIME,
    DOCX_MIME,
    HTML_MIME,
    escapeXml,
    escapeHtml,
    createXlsxBlob,
    createDocxBlob,
    buildHtmlDocument,
    createHtmlBlob
  });
}));
