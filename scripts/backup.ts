#!/usr/bin/env tsx
/**
 * Backup SQLite DB (or pg_dump if DATABASE_URL is postgres).
 * Usage: npm run backup
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
const backupDir = process.env.BACKUP_DIR || './backups';
fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');

if (dbUrl.startsWith('file:')) {
  const rel = dbUrl.replace('file:', '');
  const src = path.isAbsolute(rel) ? rel : path.join(process.cwd(), 'prisma', path.basename(rel));
  const alt = path.join(process.cwd(), rel);
  const file = fs.existsSync(src) ? src : alt;
  if (!fs.existsSync(file)) {
    console.error('DB file not found:', file);
    process.exit(1);
  }
  const dest = path.join(backupDir, `tadbirkorai-${stamp}.db`);
  fs.copyFileSync(file, dest);
  console.log('Backup written:', dest);
} else if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
  const dest = path.join(backupDir, `tadbirkorai-${stamp}.sql`);
  execSync(`pg_dump "${dbUrl}" > "${dest}"`, { stdio: 'inherit', shell: '/bin/bash' });
  console.log('Postgres dump written:', dest);
} else {
  console.error('Unsupported DATABASE_URL');
  process.exit(1);
}
