/** Parse simple bank CSV: date,description,amount OR date;description;amount */

export type ParsedCsvRow = {
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  occurredAt: Date;
  externalId: string;
};

function parseAmount(raw: string): number {
  const n = Number(String(raw).replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
  return Math.round(Math.abs(n));
}

/**
 * Neutralizes CSV/formula injection (CWE-1236): if a value starts with
 * =, +, -, @, tab, or CR, spreadsheet apps (Excel/Sheets) may interpret it as
 * a formula when this data is later re-exported. Prefixing with a single
 * quote forces text interpretation while keeping the value human-readable.
 */
export function sanitizeSpreadsheetField(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

export function parseBankCsv(content: string): ParsedCsvRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const rows: ParsedCsvRow[] = [];
  const start = /date|sana|дата/i.test(lines[0]) ? 1 : 0;

  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].includes(';') ? lines[i].split(';') : lines[i].split(',');
    if (parts.length < 3) continue;
    const [dateRaw, descRaw, amountRaw] = parts;
    const amount = parseAmount(amountRaw);
    if (!amount) continue;
    const signed = Number(String(amountRaw).replace(/\s/g, '').replace(',', '.'));
    const type: 'income' | 'expense' = signed < 0 || /chiqim|expense|debit/i.test(descRaw) ? 'expense' : 'income';
    const occurredAt = new Date(dateRaw);
    const when = Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt;
    const title = sanitizeSpreadsheetField(descRaw.trim().slice(0, 200)) || 'Bank operatsiyasi';
    rows.push({
      title,
      amount,
      type,
      category: type === 'income' ? 'sales' : 'ops',
      occurredAt: when,
      externalId: `csv:${when.toISOString().slice(0, 10)}:${title}:${amount}:${i}`,
    });
  }
  return rows;
}
