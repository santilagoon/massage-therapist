import { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await withTimeout(
    supabase.auth.signInWithPassword({
      email,
      password,
    }),
    "Supabase Auth did not respond while signing in.",
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Supabase Auth did not return a user.");
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
