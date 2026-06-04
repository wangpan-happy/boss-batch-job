#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const columns = [
  "timestamp",
  "status",
  "job_title",
  "company",
  "salary",
  "location",
  "experience",
  "education",
  "hr_or_recruiter",
  "source_url",
  "greeting",
  "notes"
];

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === "--csv" || key === "--json") {
      if (!value || value.startsWith("--")) {
        throw new Error(`${key} requires a value`);
      }
      args[key.slice(2)] = value;
      i += 1;
    }
  }
  if (!args.csv || !args.json) {
    throw new Error("Usage: node merge-application-records.mjs --csv applications.csv --json new-records.json");
  }
  return args;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (quoted && char === '"' && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const header = parseCsvLine(lines.shift());
  return lines.filter(Boolean).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    header.forEach((name, index) => {
      row[name] = values[index] || "";
    });
    return normalizeRecord(row);
  });
}

function readJsonRecords(filePath) {
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const parsed = JSON.parse(text);
  const records = Array.isArray(parsed) ? parsed : parsed.records;
  if (!Array.isArray(records)) {
    throw new Error("JSON input must be an array or an object with a records array");
  }
  return records.map(normalizeRecord);
}

function normalizeRecord(record) {
  const normalized = {};
  for (const column of columns) {
    normalized[column] = String(record[column] ?? "").trim();
  }
  if (!normalized.timestamp) normalized.timestamp = new Date().toISOString();
  if (!normalized.status) normalized.status = "contacted";
  return normalized;
}

function recordKey(record) {
  if (record.source_url) return `url:${record.source_url}`;
  return `text:${record.company}|${record.job_title}|${record.location}`.toLowerCase();
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function writeCsv(filePath, records) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const lines = [
    columns.join(","),
    ...records.map((record) => columns.map((column) => escapeCsv(record[column])).join(","))
  ];
  fs.writeFileSync(filePath, `\uFEFF${lines.join("\n")}\n`, "utf8");
}

function merge(existing, incoming) {
  const byKey = new Map();
  for (const record of existing) byKey.set(recordKey(record), record);
  for (const record of incoming) byKey.set(recordKey(record), record);
  return Array.from(byKey.values());
}

try {
  const args = parseArgs(process.argv);
  const existing = readCsv(args.csv);
  const incoming = readJsonRecords(args.json);
  const merged = merge(existing, incoming);
  writeCsv(args.csv, merged);
  console.log(JSON.stringify({
    csv: path.resolve(args.csv),
    existing: existing.length,
    incoming: incoming.length,
    total: merged.length
  }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
