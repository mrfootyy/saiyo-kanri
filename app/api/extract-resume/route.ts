import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuthenticatedUser } from "../../../lib/serverAuth";

const MODEL = process.env.OPENAI_RESUME_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(req);
    if ("response" in auth) return auth.response;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY が設定されていません。" }, { status: 500 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { dataUrl, fileType } = await req.json();

    if (!dataUrl || typeof dataUrl !== "string") {
      return NextResponse.json({ error: "dataUrl is required" }, { status: 400 });
    }

    const base64 = dataUrl.split(",")[1];
    if (!base64) {
      return NextResponse.json({ error: "Invalid dataUrl" }, { status: 400 });
    }

    const byteLength = Buffer.byteLength(base64, "base64");
    if (byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "ファイルサイズが大きすぎます。3MB以下のPDFまたは画像をアップロードしてください。" },
        { status: 400 }
      );
    }

    const isImage = fileType?.startsWith("image/");
    const isPdf = fileType === "application/pdf";

    if (!isImage && !isPdf) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const systemPrompt = `あなたは日本語の履歴書・職務経歴書を解析するAIです。
以下のJSONフォーマットで情報を抽出してください。見つからない項目はnullにしてください。

{
  "name": "氏名（漢字・表記名）",
  "nameKana": "ふりがな（ひらがな。見つからない場合はnull）",
  "email": "メールアドレス",
  "phone": "電話番号（ハイフン区切り）",
  "age": "年齢（数字のみ）",
  "skills": ["スキル1", "スキル2"],
  "companies": [{"name": "株式会社○○", "years": "2年6ヶ月"}, {"name": "合同会社△△", "years": "10ヶ月"}],
  "githubUrl": "GitHubのURL"
}

companies の years には在籍期間を月単位まで抽出し、「2年6ヶ月」「10ヶ月」「3年」のような日本語表記で入れてください。
開始年月と終了年月が記載されている場合は月数まで計算してください。在籍中・現在勤務中の場合は ${today} を基準に計算してください。
JSONのみを返してください。説明文は不要です。`;

    const response = await client.responses.create({
      model: MODEL,
      instructions: systemPrompt,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "この履歴書・職務経歴書から情報を抽出し、JSON形式だけで返してください。" },
            isImage
              ? { type: "input_image", image_url: dataUrl, detail: "high" }
              : {
                  type: "input_file",
                  filename: "resume.pdf",
                  file_data: `data:application/pdf;base64,${base64}`,
                  detail: "high",
                },
          ],
        },
      ],
      max_output_tokens: 1000,
      text: { format: { type: "json_object" } },
    });

    const content = response.output_text;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    const parsed = JSON.parse(content);

    const normalizeDuration = (obj: Record<string, unknown>) => {
      const rawYears = obj.years ?? obj.duration ?? obj.period;
      const rawMonths = obj.months;
      const yearsText = rawYears != null ? String(rawYears).trim() : "";
      const monthsText = rawMonths != null ? String(rawMonths).trim() : "";

      if (!yearsText && !monthsText) return "";
      if (/[年月]|ヶ月|か月/.test(yearsText)) return yearsText;

      const normalizedYears = yearsText.replace(/年/g, "").trim();
      const normalizedMonths = monthsText.replace(/ヶ月|か月|月/g, "").trim();
      const parts: string[] = [];
      if (normalizedYears && normalizedYears !== "0") parts.push(`${normalizedYears}年`);
      if (normalizedMonths && normalizedMonths !== "0") parts.push(`${normalizedMonths}ヶ月`);
      return parts.join("") || yearsText;
    };

    // 型の正規化
    const result = {
      name: typeof parsed.name === "string" ? parsed.name : undefined,
      nameKana: typeof parsed.nameKana === "string" ? parsed.nameKana : undefined,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
      phone: typeof parsed.phone === "string" ? parsed.phone : undefined,
      age: parsed.age != null ? String(parsed.age) : undefined,
      skills: Array.isArray(parsed.skills) ? parsed.skills.filter((s: unknown) => typeof s === "string") : undefined,
      companies: Array.isArray(parsed.companies)
        ? parsed.companies
            .map((c: unknown) => {
              if (typeof c === "string") return { name: c, years: "" };
              if (c && typeof c === "object") {
                const obj = c as Record<string, unknown>;
                return { name: String(obj.name ?? ""), years: normalizeDuration(obj) };
              }
              return null;
            })
            .filter((c: { name: string; years: string } | null): c is { name: string; years: string } => c !== null && c.name !== "")
        : undefined,
      githubUrl: typeof parsed.githubUrl === "string" ? parsed.githubUrl : undefined,
    };

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("extract-resume error:", err);
    const status = (err as { status?: number })?.status;
    if (status === 401) return NextResponse.json({ error: "APIキーが無効です。.env.local を確認してください。" }, { status: 401 });
    if (status === 429) return NextResponse.json({ error: "OpenAI APIのクォータを超過しています。残高を確認してください。" }, { status: 429 });
    if (status === 400) return NextResponse.json({ error: "ファイル形式をAIが読み取れませんでした。別のPDFまたは画像で試してください。" }, { status: 400 });
    return NextResponse.json({ error: "AI読み取りに失敗しました。" }, { status: 500 });
  }
}
