/**
 * Pure decision logic for what to do with an incoming, already-verified OIDC
 * identity. Kept dependency-free (no DB/network) so every branch — including
 * every dangerous one — is directly unit-testable.
 *
 * Hard security rule enforced here: email equality is NEVER sufficient proof
 * of account ownership. Two different providers (or a provider and a local
 * password account) sharing an email are only ever linked through an
 * explicit, already-authenticated "link this account" action — never
 * automatically during login/registration.
 */

export type AccountResolution =
  | { action: 'login'; userId: string }
  | { action: 'create' }
  | { action: 'link'; userId: string }
  | { action: 'noop_already_linked'; userId: string }
  | {
      action: 'error';
      code: 'ACCOUNT_EXISTS_DIFFERENT_METHOD' | 'EMAIL_NOT_VERIFIED' | 'LINKED_TO_OTHER_USER';
    };

export function resolveOAuthAccount(input: {
  /** userId of the local User already linked to this exact (provider, providerAccountId), if any. */
  existingOAuthAccountUserId: string | null;
  /** userId of a local User whose email matches the provider's reported email, if any. */
  existingUserIdByEmail: string | null;
  /** Whether the provider vouches this email address is verified/owned by the identity. */
  emailVerified: boolean;
  /**
   * Set only when this OAuth round-trip was explicitly started by an
   * already-authenticated user from their profile ("link Google/Microsoft
   * account"), carrying their userId from a server-signed handshake.
   */
  linkUserId?: string;
}): AccountResolution {
  const { existingOAuthAccountUserId, existingUserIdByEmail, emailVerified, linkUserId } = input;

  if (linkUserId) {
    if (existingOAuthAccountUserId) {
      return existingOAuthAccountUserId === linkUserId
        ? { action: 'noop_already_linked', userId: linkUserId }
        : { action: 'error', code: 'LINKED_TO_OTHER_USER' };
    }
    return { action: 'link', userId: linkUserId };
  }

  // Returning OAuth user: this exact provider identity has signed in before.
  if (existingOAuthAccountUserId) {
    return { action: 'login', userId: existingOAuthAccountUserId };
  }

  // First time this provider identity is seen, but an account with the same
  // email already exists via a different method. Do not auto-merge.
  if (existingUserIdByEmail) {
    return { action: 'error', code: 'ACCOUNT_EXISTS_DIFFERENT_METHOD' };
  }

  // Brand new identity, no colliding account — registration requires the
  // provider to vouch the email is verified.
  if (!emailVerified) {
    return { action: 'error', code: 'EMAIL_NOT_VERIFIED' };
  }

  return { action: 'create' };
}
