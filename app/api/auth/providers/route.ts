import { jsonOk } from '@/lib/api';
import { isProviderConfigured } from '@/lib/oauth/providers';

/**
 * Public: which social logins are actually wired (client id+secret present).
 * Never returns secrets or client IDs — the login page uses this to show
 * compact Google/Microsoft buttons only when the PKCE flow can run.
 */
export async function GET() {
  return jsonOk({
    google: isProviderConfigured('google'),
    microsoft: isProviderConfigured('microsoft'),
  });
}
