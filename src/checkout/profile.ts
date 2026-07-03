// Single source of truth for M25 saved-checkout-profile persistence.
//
// Two readers with deliberately different strictness live here:
//   - parseCheckoutProfile: TOLERANT. Used by the checkout restore-on-mount
//     flow to pre-fill the form from whatever partial data exists. Never fails.
//   - loadCheckoutProfile: STRICT. Used by the guest Account screen to decide
//     between "no saved details", "corrupt data", and a real storage failure.
//
// Neither reader ever writes, repairs, clears, or normalizes stored bytes.

import AsyncStorage from '@react-native-async-storage/async-storage';

// The canonical M25 key. Must remain exactly this value.
export const CHECKOUT_PROFILE_KEY = '@dmv_nail_supply/saved_checkout_details';

// The reusable subset of the checkout form that is persisted (note excluded).
export type CheckoutProfile = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

// Tolerant reader used by checkout restore-on-mount. Coerces every field to a
// string and returns {} for non-objects, so form pre-fill never throws.
export function parseCheckoutProfile(raw: unknown): Partial<CheckoutProfile> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  return {
    fullName: str(obj.fullName),
    email: str(obj.email),
    phone: str(obj.phone),
    address: str(obj.address),
    city: str(obj.city),
    state: str(obj.state),
    zip: str(obj.zip),
  };
}

// Account-facing strict read result. Distinguishes a genuine empty profile from
// corrupt bytes and a real I/O failure so the UI can respond appropriately.
export type LoadCheckoutProfileResult =
  | { ok: true; profile: CheckoutProfile | null }
  | { ok: false; reason: 'storage' | 'corrupt' };

const PROFILE_FIELDS = [
  'fullName',
  'email',
  'phone',
  'address',
  'city',
  'state',
  'zip',
] as const;

// Strictly validate a parsed value as a complete saved M25 profile. All seven
// fields must be strings; a successful M25 checkout always saves validated
// contact data, so a usable profile must have non-blank fullName and email.
function validateProfile(raw: unknown): CheckoutProfile | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  for (const f of PROFILE_FIELDS) {
    if (typeof o[f] !== 'string') return null;
  }
  const profile = o as unknown as CheckoutProfile;
  if (!profile.fullName.trim() || !profile.email.trim()) return null;
  return {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    address: profile.address,
    city: profile.city,
    state: profile.state,
    zip: profile.zip,
  };
}

// Strict, resilient, read-only load for the guest Account screen. Never throws.
// A real getItem() rejection is reported as 'storage'; present-but-unusable
// bytes are 'corrupt' (never relabeled as "no saved details").
export async function loadCheckoutProfile(): Promise<LoadCheckoutProfileResult> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(CHECKOUT_PROFILE_KEY);
  } catch {
    return { ok: false, reason: 'storage' };
  }

  // Missing key — the legitimate "never saved" state.
  if (raw === null) return { ok: true, profile: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'corrupt' };
  }

  const profile = validateProfile(parsed);
  if (!profile) return { ok: false, reason: 'corrupt' };
  return { ok: true, profile };
}
