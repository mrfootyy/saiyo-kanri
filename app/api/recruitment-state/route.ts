import { createSupabaseClient } from "../../../lib/supabase";

const STATE_ID = "default";

export async function GET() {
  try {
    const supabase = createSupabaseClient();
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
    const body = await request.json();
    const supabase = createSupabaseClient();
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
