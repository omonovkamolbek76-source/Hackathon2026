import { SESSION_COOKIE } from '@/lib/auth';
import { jsonOk } from '@/lib/api';
import { cookies } from 'next/headers';

export async function POST() {
  cookies().set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return jsonOk({ ok: true });
}
