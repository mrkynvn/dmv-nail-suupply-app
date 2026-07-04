// Provider-neutral authentication types. This is a forward-looking boundary:
// no provider SDK credential/token shapes live here, only the stable identity
// and status concepts a future real sign-in flow will resolve to.

// Sign-in providers we intend to support. Extend as new providers are added.
export type AuthProvider = 'apple' | 'google';

// A customer's stable, provider-neutral identity once authenticated. Fields are
// chosen to survive provider swaps; provider-specific claims stay out of here.
export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  provider: AuthProvider;
};

// Lifecycle of the auth boundary. "guest" is the default browsing state;
// "expired" marks a previously-authenticated session that must re-authenticate.
export type AuthStatus = 'guest' | 'authenticated' | 'expired';
