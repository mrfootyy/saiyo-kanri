import { requireAuthenticatedUser } from "../../../lib/serverAuth";
import { apiError } from "../../../lib/apiError";
import { isStoredRecruitmentData } from "../../recruitment/context";

const STATE_ID = "default";

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const { supabase } = auth;
    const { data, error } = await supabase
      .from("recruitment_state")
      .select("data")
      .eq("id", STATE_ID)
      .maybeSingle();

    if (error) return apiError("採用データの取得に失敗しました。", 500);

    return Response.json({ data: data?.data ?? null });
  } catch {
    return apiError("採用データの取得に失敗しました。", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const body: unknown = await request.json();
    if (!isStoredRecruitmentData(body)) {
      return apiError("リクエストデータの形式が不正です。", 400);
    }

    const { supabase } = auth;
    const { error } = await supabase
      .from("recruitment_state")
      .upsert({
        id: STATE_ID,
        data: body,
        updated_at: new Date().toISOString(),
      });

    if (error) return apiError("採用データの保存に失敗しました。", 500);

    return Response.json({ ok: true });
  } catch {
    return apiError("採用データの保存に失敗しました。", 500);
  }
}
