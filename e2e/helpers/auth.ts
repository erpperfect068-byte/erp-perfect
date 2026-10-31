import type { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://evxeqsfuyvisfkqxdaqv.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const E2E_EMAIL = process.env.E2E_EMAIL || 'admin@gmail.com';

function supabaseStorageKey(url: string) {
  const ref = new URL(url).hostname.split('.')[0];
  return `sb-${ref}-auth-token`;
}

/**
 * Mint a real session for E2E without knowing the user password:
 * service-role generateLink → anon verifyOtp → access/refresh tokens.
 */
async function mintSessionForEmail(email: string) {
  if (!SERVICE_KEY || !ANON_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkErr || !linkData?.properties?.hashed_token) {
    throw new Error(`generateLink failed: ${linkErr?.message || 'no hashed_token'}`);
  }

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: otpData, error: otpErr } = await anon.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'email',
  });
  if (otpErr || !otpData.session) {
    throw new Error(`verifyOtp failed: ${otpErr?.message || 'no session'}`);
  }

  return otpData.session;
}

export async function loginAsAdmin(page: Page) {
  const session = await mintSessionForEmail(E2E_EMAIL);
  const storageKey = supabaseStorageKey(SUPABASE_URL);

  await page.goto('/login');
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    {
      key: storageKey,
      value: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        token_type: 'bearer',
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        user: session.user,
      },
    }
  );

  await page.goto('/');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 });
}
