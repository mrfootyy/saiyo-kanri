import { SlackNotification } from "../../recruitment/types";

export async function POST(request: Request) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    return Response.json(
      { error: "SLACK_WEBHOOK_URL が設定されていません。" },
      { status: 500 }
    );
  }

  try {
    const { notifications } = await request.json();

    if (!Array.isArray(notifications)) {
      return Response.json(
        { error: "notifications must be an array." },
        { status: 400 }
      );
    }

    await Promise.all(
      (notifications as SlackNotification[]).map(async (notification) => {
        const response = await fetch(webhookUrl, {
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
