import { jsonOk } from '@/lib/api';

export async function GET() {
  return jsonOk({
    ok: true,
    service: 'tadbirkorai',
    time: new Date().toISOString(),
  });
}
