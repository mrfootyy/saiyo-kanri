import { requireAuthenticatedUser } from "../../../lib/serverAuth";

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

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ data: data?.data ?? null });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load recruitment state." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const { supabase } = auth;
    const { error } = await supabase
      .from("recruitment_state")
      .upsert({
        id: STATE_ID,
        data: body,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to save recruitment state." },
      { status: 500 }
    );
  }
}
