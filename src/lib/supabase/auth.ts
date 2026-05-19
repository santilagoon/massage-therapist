import { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export class AdminAuthError extends Error {
  constructor(
    public readonly code:
      | "account_not_confirmed"
      | "access_unavailable"
      | "invalid_credentials",
  ) {
    super(code);
  }
}

export async function getCurrentAdminUser() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await withTimeout(
    supabase.auth.getUser(),
    "Supabase Auth did not respond while checking the session.",
  );
  if (error) {
    return null;
  }

  return data.user;
}

export async function signInAdmin(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new AdminAuthError("access_unavailable");
  }

  const { data, error } = await withTimeout(
    supabase.auth.signInWithPassword({
      email,
      password,
    }),
    "Supabase Auth did not respond while signing in.",
  );

  if (error) {
    const normalizedMessage = error.message.toLowerCase();
    if (normalizedMessage.includes("email not confirmed")) {
      throw new AdminAuthError("account_not_confirmed");
    }

    if (
      normalizedMessage.includes("invalid login credentials") ||
      normalizedMessage.includes("invalid credentials")
    ) {
      throw new AdminAuthError("invalid_credentials");
    }

    throw new AdminAuthError("access_unavailable");
  }

  if (!data.user) {
    throw new AdminAuthError("access_unavailable");
  }

  return data.user as User;
}

export async function signOutAdmin() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return;
  }

  await withTimeout(
    supabase.auth.signOut(),
    "Supabase Auth did not respond while signing out.",
  );
}

function withTimeout<T>(promise: Promise<T>, message: string, timeoutMs = 12_000) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}
