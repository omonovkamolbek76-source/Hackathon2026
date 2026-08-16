#!/usr/bin/env tsx
/** Merge process.env secrets into .env (never prints values). */
import fs from 'fs';

const KEYS = [
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'SENTRY_DSN',
  'DATABASE_URL',
  'AUTH_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID',
  'APP_URL',
  'LOG_LEVEL',
];

const path = '.env';
const existing = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const map = new Map<string, string>();
for (const line of existing.split(/\r?\n/)) {
  if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  map.set(line.slice(0, i), line.slice(i + 1));
}

let updated = 0;
for (const key of KEYS) {
  const v = process.env[key];
  if (v != null && v !== '') {
    map.set(key, JSON.stringify(v)); // quoted
    updated += 1;
  }
}

const header = `# TadbirkorAI .env — generated/updated by scripts/sync-secrets-to-env.ts\n`;
const body = KEYS.map((k) => `${k}=${map.get(k) ?? '""'}`).join('\n') + '\n';
fs.writeFileSync(path, header + body);
console.log(`Synced ${updated} secret(s) into .env (values not shown)`);
