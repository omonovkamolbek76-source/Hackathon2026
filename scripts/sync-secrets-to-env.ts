#!/usr/bin/env tsx
/** Merge process.env secrets into .env without wiping existing values. Never prints secrets. */
import fs from 'fs';

const KEYS = [
  'DATABASE_URL',
  'AUTH_SECRET',
  'NEXT_PUBLIC_APP_NAME',
  'APP_URL',
  'NODE_ENV',
  'GEMINI_API_KEY',
  'GEMINI_API_KEY_1',
  'GEMINI_API_KEY_2',
  'GEMINI_API_KEY_3',
  'GEMINI_MODEL',
  'SENTRY_DSN',
  'LOG_LEVEL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID',
  'BACKUP_DIR',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET',
  'MICROSOFT_TENANT_ID',
] as const;

const path = '.env';
const existing = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const map = new Map<string, string>();

for (const line of existing.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  const i = trimmed.indexOf('=');
  const key = trimmed.slice(0, i);
  let val = trimmed.slice(i + 1);
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  map.set(key, val);
}

let updated = 0;
for (const key of KEYS) {
  const fromEnv = process.env[key];
  if (fromEnv != null && fromEnv !== '') {
    map.set(key, fromEnv);
    updated += 1;
  }
}

if (!map.get('AUTH_SECRET') || (map.get('AUTH_SECRET') || '').length < 32) {
  map.set('AUTH_SECRET', require('crypto').randomBytes(48).toString('base64url'));
  updated += 1;
}
if (!map.get('DATABASE_URL')) map.set('DATABASE_URL', 'file:./dev.db');
if (!map.get('GEMINI_MODEL')) map.set('GEMINI_MODEL', 'gemini-2.0-flash');
if (!map.get('NEXT_PUBLIC_APP_NAME')) map.set('NEXT_PUBLIC_APP_NAME', 'TadbirkorAI');
if (!map.get('APP_URL')) map.set('APP_URL', 'http://localhost:3000');
if (!map.get('LOG_LEVEL')) map.set('LOG_LEVEL', 'info');
if (!map.get('BACKUP_DIR')) map.set('BACKUP_DIR', './backups');

const lines = [
  '# TadbirkorAI .env (gitignored)',
  ...KEYS.map((k) => `${k}="${(map.get(k) || '').replace(/"/g, '\\"')}"`),
  '',
];
fs.writeFileSync(path, lines.join('\n'));
console.log(`Synced ${updated} value(s) from process.env into .env`);
for (const k of ['GEMINI_API_KEY', 'SENTRY_DSN', 'DATABASE_URL', 'AUTH_SECRET']) {
  const v = map.get(k) || '';
  console.log(`- ${k}: ${v ? `set (len ${v.length})` : 'empty'}`);
}
