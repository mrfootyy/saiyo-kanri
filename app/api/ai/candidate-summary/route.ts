import OpenAI from "openai";
import { requireAuthenticatedUser } from "../../../../lib/serverAuth";

type CandidateSummary = {
  strengths: string[];
  concerns: string[];
  nextQuestions: string[];
  overallComment: string;
};

const fallbackSummary: CandidateSummary = {
  strengths: [],
  concerns: [],
  nextQuestions: [],
  overallComment: "AI要約を作成できませんでした。候補者情報を確認して、もう一度実行してください。",
};

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if ("response" in auth) return auth.response;

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY が設定されていません。" },
      { status: 500 }
    );
  }

  const candidate = await request.json();

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
      instructions:
        "あなたは採用担当者を支援するAIです。候補者情報をもとに、採用判断を断定せず、面接準備に役立つ要約を日本語で作成してください。差別的・不適切な属性推定は避け、職務経験、スキル、面接記録、評価根拠に基づいてください。必ずJSONのみを返してください。",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `次の候補者情報を要約してください。JSON形式は {"strengths": string[], "concerns": string[], "nextQuestions": string[], "overallComment": string} です。\n\n${JSON.stringify(candidate, null, 2)}`,
            },
          ],
        },
      ],
    });

    return Response.json({ summary: parseSummary(response.output_text) });
  } catch (error) {
    console.error("Failed to generate candidate summary", error);
    return Response.json(
      { error: "AI要約の生成に失敗しました。" },
      { status: 500 }
    );
  }
}

function parseSummary(text: string): CandidateSummary {
  try {
    const parsed = JSON.parse(text) as Partial<CandidateSummary>;
    return {
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : [],
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns.slice(0, 5) : [],
      nextQuestions: Array.isArray(parsed.nextQuestions) ? parsed.nextQuestions.slice(0, 5) : [],
      overallComment: typeof parsed.overallComment === "string" ? parsed.overallComment : fallbackSummary.overallComment,
    };
  } catch {
    return {
      ...fallbackSummary,
      overallComment: text || fallbackSummary.overallComment,
    };
  }
}
