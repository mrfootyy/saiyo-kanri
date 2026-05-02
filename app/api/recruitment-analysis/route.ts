import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuthenticatedUser } from "../../../lib/serverAuth";
import { apiError } from "../../../lib/apiError";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(req);
    if ("response" in auth) return auth.response;

    if (!process.env.OPENAI_API_KEY) {
      return apiError("AI機能が設定されていません。管理者にお問い合わせください。", 500);
    }

    const body = await req.json();
    const { stats } = body as { stats: Record<string, unknown> };

    if (!stats) {
      return apiError("分析データが指定されていません。", 400);
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `あなたは採用担当者の採用データアナリストです。
以下の採用データを分析し、採用活動改善に役立つ具体的なインサイトを3点、日本語で提供してください。

## 採用データ
${JSON.stringify(stats, null, 2)}

## 出力形式
以下のJSON配列で3件のインサイトを返してください。各インサイトは1〜2文で具体的に記述してください。
["インサイト1", "インサイト2", "インサイト3"]

余計な説明や前置きは不要です。JSON配列のみ返してください。`;

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content?.trim() ?? "[]";

    let insights: string[] = [];
    try {
      insights = JSON.parse(content);
    } catch {
      // JSONパース失敗時は行ごとに分割してフォールバック
      insights = content.split("\n").filter((l) => l.trim()).slice(0, 3);
    }

    return NextResponse.json({ insights });
  } catch (err) {
    console.error("recruitment-analysis error:", err);
    return apiError("分析の生成に失敗しました。", 500);
  }
}
