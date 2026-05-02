import OpenAI from "openai";
import { requireAuthenticatedUser } from "../../../../lib/serverAuth";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const TRANSCRIPTION_MODEL = process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-mini-transcribe";
const SUMMARY_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";

type InterviewSummaryResponse = {
  transcript: string;
  summary: string;
  highlights: string[];
  concerns: string[];
  nextActions: string[];
};

const fallbackSummary: InterviewSummaryResponse = {
  transcript: "",
  summary: "AI要約を作成できませんでした。文字起こしを確認して、必要に応じて手動でメモしてください。",
  highlights: [],
  concerns: [],
  nextActions: [],
};

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ("response" in auth) return auth.response;

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "OPENAI_API_KEY が設定されていません。" }, { status: 500 });
    }

    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return Response.json({ error: "audio file is required" }, { status: 400 });
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return Response.json({ error: "録音データが大きすぎます。25MB以下にしてください。" }, { status: 400 });
    }

    const candidateName = asText(formData.get("candidateName"));
    const candidatePosition = asText(formData.get("candidatePosition"));
    const stageName = asText(formData.get("stageName"));
    const questions = asText(formData.get("questions"));
    const existingNotes = asText(formData.get("notes"));

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const transcription = await client.audio.transcriptions.create({
      file: audio,
      model: TRANSCRIPTION_MODEL,
      language: "ja",
      prompt: [
        "日本語の採用面接の会話です。",
        candidateName ? `候補者名: ${candidateName}` : "",
        candidatePosition ? `職種: ${candidatePosition}` : "",
        stageName ? `選考ステージ: ${stageName}` : "",
        questions ? `面接で使う質問: ${questions}` : "",
      ].filter(Boolean).join("\n"),
    });

    const transcript = transcription.text?.trim() ?? "";
    if (!transcript) {
      return Response.json({ error: "文字起こしを作成できませんでした。" }, { status: 500 });
    }

    const response = await client.responses.create({
      model: SUMMARY_MODEL,
      instructions: `あなたは採用面接の記録を整理するAIです。
採用判断を断定せず、面接中に話された事実・発言・評価根拠に基づいて日本語で要約してください。
年齢、性別、国籍、家族構成など職務と関係しない属性推定や差別的判断は避けてください。
必ずJSONのみを返してください。`,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `次の面接文字起こしを要約してください。
JSON形式は {"summary": string, "highlights": string[], "concerns": string[], "nextActions": string[]} です。

候補者: ${candidateName || "未指定"}
職種: ${candidatePosition || "未指定"}
選考ステージ: ${stageName || "未指定"}
面接質問:
${questions || "未指定"}

既存メモ:
${existingNotes || "なし"}

文字起こし:
${transcript}`,
            },
          ],
        },
      ],
      max_output_tokens: 1200,
      text: { format: { type: "json_object" } },
    });

    const parsed = parseSummary(response.output_text);
    return Response.json({ ...parsed, transcript });
  } catch (error) {
    console.error("interview-audio-summary error:", error);
    const status = (error as { status?: number })?.status;
    if (status === 401) return Response.json({ error: "AI機能の認証に失敗しました。管理者にお問い合わせください。" }, { status: 401 });
    if (status === 429) return Response.json({ error: "AI機能の利用制限に達しています。しばらくしてから再試行してください。" }, { status: 429 });
    return Response.json({ error: "録音の文字起こし・要約に失敗しました。" }, { status: 500 });
  }
}

function asText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function parseSummary(text: string): InterviewSummaryResponse {
  try {
    const parsed = JSON.parse(text) as Partial<InterviewSummaryResponse>;
    return {
      transcript: "",
      summary: typeof parsed.summary === "string" ? parsed.summary : fallbackSummary.summary,
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights.filter((item): item is string => typeof item === "string").slice(0, 8) : [],
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns.filter((item): item is string => typeof item === "string").slice(0, 8) : [],
      nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions.filter((item): item is string => typeof item === "string").slice(0, 8) : [],
    };
  } catch {
    return { ...fallbackSummary, summary: text || fallbackSummary.summary };
  }
}
