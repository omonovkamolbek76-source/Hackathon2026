import { describe, expect, it } from 'vitest';
import { parseBankCsv } from '@/lib/csv-import';
import { generateMfaSecret, verifyMfaToken, currentMfaToken } from '@/lib/mfa';

describe('csv import', () => {
  it('parses income and expense rows', () => {
    const rows = parseBankCsv('2026-08-01,Savdo,1500000\n2026-08-02,Ijara,-800000');
    expect(rows).toHaveLength(2);
    expect(rows[0].type).toBe('income');
    expect(rows[1].type).toBe('expense');
    expect(rows[1].amount).toBe(800000);
  });
});

describe('mfa', () => {
  it('verifies totp', () => {
    const secret = generateMfaSecret();
    const token = currentMfaToken(secret);
    expect(verifyMfaToken(secret, token)).toBe(true);
    expect(verifyMfaToken(secret, '000000')).toBe(false);
  });
});
