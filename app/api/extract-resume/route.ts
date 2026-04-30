import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const MODEL = process.env.OPENAI_RESUME_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
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
        { error: "ファイルサイズが大きすぎます。15MB以下のPDFまたは画像をアップロードしてください。" },
        { status: 400 }
      );
    }

    const isImage = fileType?.startsWith("image/");
    const isPdf = fileType === "application/pdf";

    if (!isImage && !isPdf) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const systemPrompt = `あなたは日本語の履歴書・職務経歴書を解析するAIです。
以下のJSONフォーマットで情報を抽出してください。見つからない項目はnullにしてください。

{
  "email": "メールアドレス",
  "phone": "電話番号（ハイフン区切り）",
  "age": "年齢（数字のみ）",
  "skills": ["スキル1", "スキル2"],
  "companies": [{"name": "株式会社○○", "years": "3"}, {"name": "合同会社△△", "years": "2"}],
  "githubUrl": "GitHubのURL"
}

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

    // 型の正規化
    const result = {
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
                return { name: String(obj.name ?? ""), years: obj.years != null ? String(obj.years) : "" };
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
