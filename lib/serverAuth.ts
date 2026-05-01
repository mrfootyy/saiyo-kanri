import { User } from "@supabase/supabase-js";
import { createSupabaseClient } from "./supabase";

type AuthSuccess = {
  supabase: ReturnType<typeof createSupabaseClient>;
  user: User;
};

type AuthFailure = {
  response: Response;
};

export async function requireAuthenticatedUser(request: Request): Promise<AuthSuccess | AuthFailure> {
  const token = getBearerToken(request);

  if (!token) {
    return {
      response: Response.json({ error: "ログインが必要です。" }, { status: 401 }),
    };
  }

  const supabase = createSupabaseClient(token);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return {
      response: Response.json({ error: "セッションが無効です。再ログインしてください。" }, { status: 401 }),
    };
  }

  return { supabase, user: data.user };
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  const [scheme, token] = authorization?.split(" ") ?? [];

  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}
