import { SlackNotification } from "../../recruitment/types";
import { requireAuthenticatedUser } from "../../../lib/serverAuth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if ("response" in auth) return auth.response;

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  try {
    const body = await request.json();
    const { notifications, webhookUrl: bodyWebhookUrl } = body as { notifications: unknown; webhookUrl?: string };
    const resolvedWebhookUrl = bodyWebhookUrl || webhookUrl;

    if (!resolvedWebhookUrl) {
      return Response.json(
        { error: "SLACK_WEBHOOK_URL が設定されていません。" },
        { status: 500 }
      );
    }

    if (!Array.isArray(notifications)) {
      return Response.json(
        { error: "notifications must be an array." },
        { status: 400 }
      );
    }

    await Promise.all(
      (notifications as SlackNotification[]).map(async (notification) => {
        const response = await fetch(resolvedWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: formatSlackMessage(notification),
            mrkdwn: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`Slack webhook failed: ${response.status}`);
        }
      })
    );

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Failed to send Slack notification", error);
    return Response.json(
      { error: "Slack通知の送信に失敗しました。" },
      { status: 500 }
    );
  }
}

function formatSlackMessage(notification: SlackNotification) {
  return `*採用管理通知* (${notification.channel})\n${notification.message}`;
}
