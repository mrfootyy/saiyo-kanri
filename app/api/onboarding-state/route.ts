import { requireAuthenticatedUser } from "../../../lib/serverAuth";
import { apiError } from "../../../lib/apiError";

const STATE_ID = "default";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { supabase } = auth;
    const { data, error } = await supabase
      .from("onboarding_state")
      .select("data")
      .eq("id", STATE_ID)
      .maybeSingle();

    if (error) return apiError("オンボーディングデータの取得に失敗しました。", 500);

    return Response.json({ data: data?.data ?? null });
  } catch {
    return apiError("オンボーディングデータの取得に失敗しました。", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return apiError("リクエストデータの形式が不正です。", 400);
    }

    const { supabase } = auth;
    const { error } = await supabase
      .from("onboarding_state")
      .upsert({
        id: STATE_ID,
        data: body,
        updated_at: new Date().toISOString(),
      });

    if (error) return apiError("オンボーディングデータの保存に失敗しました。", 500);

    return Response.json({ ok: true });
  } catch {
    return apiError("オンボーディングデータの保存に失敗しました。", 500);
  }
}
