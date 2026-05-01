import { createClient, SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function createSupabaseClient(accessToken?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are not set.");
  }

  const isBrowserSessionClient = typeof window !== "undefined" && !accessToken;

  if (isBrowserSessionClient && browserClient) return browserClient;

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: isBrowserSessionClient,
      autoRefreshToken: isBrowserSessionClient,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });

  if (isBrowserSessionClient) browserClient = client;

  return client;
}
