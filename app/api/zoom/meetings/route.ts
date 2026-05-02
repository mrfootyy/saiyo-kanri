import { requireAuthenticatedUser } from "../../../../lib/serverAuth";

type ZoomTokenResponse = {
  access_token?: string;
  error?: string;
  reason?: string;
};

type ZoomMeetingResponse = {
  join_url?: string;
  start_url?: string;
  id?: number;
  password?: string;
  error?: string;
  message?: string;
};

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if ("response" in auth) return auth.response;

  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  const userId = process.env.ZOOM_USER_ID ?? "me";

  if (!accountId || !clientId || !clientSecret) {
    return Response.json(
      { error: "Zoom API の環境変数が設定されていません。" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const topic = asText(body.topic) || "採用面接";
    const startTime = asText(body.startTime);
    const timezone = asText(body.timezone) || "Asia/Tokyo";
    const duration = asPositiveNumber(body.durationMinutes) ?? 60;

    const token = await getZoomAccessToken(accountId, clientId, clientSecret);
    const meetingController = new AbortController();
    const meetingTimeout = setTimeout(() => meetingController.abort(), 10000);
    const response = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(userId)}/meetings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        type: 2,
        start_time: startTime || undefined,
        timezone,
        duration,
        settings: {
          join_before_host: false,
          waiting_room: true,
          approval_type: 2,
          audio: "both",
        },
      }),
      signal: meetingController.signal,
    });
    clearTimeout(meetingTimeout);

    const raw = await response.json().catch(() => null);
    const result: ZoomMeetingResponse = raw !== null && typeof raw === "object" ? raw as ZoomMeetingResponse : {};
    if (!response.ok || !result.join_url) {
      return Response.json(
        { error: result.message ?? result.error ?? "Zoomミーティングの作成に失敗しました。" },
        { status: response.status || 500 }
      );
    }

    return Response.json({
      joinUrl: result.join_url,
      startUrl: result.start_url,
      meetingId: result.id,
      password: result.password,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Zoomミーティングの作成に失敗しました。" },
      { status: 500 }
    );
  }
}

async function getZoomAccessToken(accountId: string, clientId: string, clientSecret: string) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const params = new URLSearchParams({
    grant_type: "account_credentials",
    account_id: accountId,
  });

  const tokenController = new AbortController();
  const tokenTimeout = setTimeout(() => tokenController.abort(), 10000);
  const response = await fetch(`https://zoom.us/oauth/token?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
    },
    signal: tokenController.signal,
  });
  clearTimeout(tokenTimeout);

  const raw = await response.json().catch(() => null);
  const result: ZoomTokenResponse = raw !== null && typeof raw === "object" ? raw as ZoomTokenResponse : {};
  if (!response.ok || !result.access_token) {
    throw new Error(result.reason ?? result.error ?? "Zoomアクセストークンの取得に失敗しました。");
  }

  return result.access_token;
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asPositiveNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}
