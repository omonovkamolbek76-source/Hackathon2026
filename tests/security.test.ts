import { describe, expect, it } from 'vitest';
import { createHmac } from 'crypto';
import { parseBankCsv, sanitizeSpreadsheetField } from '@/lib/csv-import';
import { verifyStripeWebhookSignature } from '@/lib/payments';
import { verifyPasswordConstantTime, hashPassword } from '@/lib/auth';

describe('CSV formula-injection defense', () => {
  it('prefixes formula-like leading characters with a quote', () => {
    expect(sanitizeSpreadsheetField('=cmd|"/c calc"!A0')).toBe("'=cmd|\"/c calc\"!A0");
    expect(sanitizeSpreadsheetField('+1+1')).toBe("'+1+1");
    expect(sanitizeSpreadsheetField('-1+1')).toBe("'-1+1");
    expect(sanitizeSpreadsheetField('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('leaves normal text untouched', () => {
    expect(sanitizeSpreadsheetField('Naqd savdo')).toBe('Naqd savdo');
    expect(sanitizeSpreadsheetField('Ijara to‘lovi')).toBe('Ijara to‘lovi');
  });

  it('sanitizes malicious CSV titles on import', () => {
    const rows = parseBankCsv('2026-08-01,=HYPERLINK("http://evil.test"),1500000');
    expect(rows).toHaveLength(1);
    expect(rows[0].title.startsWith("'=")).toBe(true);
  });
});

describe('Stripe webhook signature verification', () => {
  const secret = 'whsec_test_secret_1234567890';
  const body = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' });

  function sign(payload: string, ts: number) {
    const v1 = createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex');
    return `t=${ts},v1=${v1}`;
  }

  it('accepts a validly signed, fresh payload', () => {
    const header = sign(body, Math.floor(Date.now() / 1000));
    expect(verifyStripeWebhookSignature(body, header, secret)).toBe(true);
  });

  it('rejects a tampered payload', () => {
    const header = sign(body, Math.floor(Date.now() / 1000));
    const tampered = body.replace('evt_1', 'evt_2');
    expect(verifyStripeWebhookSignature(tampered, header, secret)).toBe(false);
  });

  it('rejects a signature made with the wrong secret', () => {
    const wrongV1 = createHmac('sha256', 'wrong_secret').update(`${Math.floor(Date.now() / 1000)}.${body}`).digest('hex');
    const header = `t=${Math.floor(Date.now() / 1000)},v1=${wrongV1}`;
    expect(verifyStripeWebhookSignature(body, header, secret)).toBe(false);
  });

  it('rejects an expired (replayed) timestamp', () => {
    const oldTs = Math.floor(Date.now() / 1000) - 60 * 60; // 1 hour old
    const header = sign(body, oldTs);
    expect(verifyStripeWebhookSignature(body, header, secret)).toBe(false);
  });

  it('rejects a missing signature header', () => {
    expect(verifyStripeWebhookSignature(body, null, secret)).toBe(false);
  });

  it('rejects a malformed signature header', () => {
    expect(verifyStripeWebhookSignature(body, 'not-a-valid-header', secret)).toBe(false);
  });
});

describe('login timing / account-enumeration mitigation', () => {
  it('constant-time verify rejects with a dummy hash when the user does not exist', async () => {
    const ok = await verifyPasswordConstantTime('any-password', undefined);
    expect(ok).toBe(false);
  });

  it('constant-time verify still validates a real password correctly', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(await verifyPasswordConstantTime('correct-horse-battery-staple', hash)).toBe(true);
    expect(await verifyPasswordConstantTime('wrong-password', hash)).toBe(false);
  });
});
