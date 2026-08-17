import { NextResponse } from 'next/server';

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  const headers: Record<string, string> = {};
  if (typeof extra?.retryAfterSec === 'number' && Number.isFinite(extra.retryAfterSec)) {
    headers['Retry-After'] = String(Math.max(0, Math.ceil(extra.retryAfterSec)));
  }
  return NextResponse.json({ error: message, ...extra }, { status, headers });
}
