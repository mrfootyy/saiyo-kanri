import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

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
  "companies": ["株式会社○○", "合同会社△△"],
  "experienceYears": "経験年数（数字のみ）",
  "githubUrl": "GitHubのURL"
}

JSONのみを返してください。説明文は不要です。`;

    let response;

    if (isImage) {
      // 画像はvision APIで直接読み取り
      response = await client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "この履歴書・職務経歴書から情報を抽出してください。" },
              { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
            ],
          },
        ],
        max_tokens: 1000,
        response_format: { type: "json_object" },
      });
    } else {
      // PDFはバイナリからテキストを取り出してテキストとして送信
      const binaryStr = Buffer.from(base64, "base64").toString("latin1");
      // PDFストリームからテキストブロックを抽出（BT...ETブロック、Tj、TJオペレータ）
      const textChunks: string[] = [];
      const btEtRegex = /BT([\s\S]*?)ET/g;
      let btMatch: RegExpExecArray | null;
      while ((btMatch = btEtRegex.exec(binaryStr)) !== null) {
        const block = btMatch[1];
        // (テキスト)Tj または [(テキスト)]TJ パターン
        const tjRegex = /\(([^)]*)\)\s*Tj|\[([^\]]*)\]\s*TJ/g;
        let tjMatch: RegExpExecArray | null;
        while ((tjMatch = tjRegex.exec(block)) !== null) {
          const raw = (tjMatch[1] ?? tjMatch[2] ?? "").replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
          if (raw.trim()) textChunks.push(raw.trim());
        }
      }
      const extractedText = textChunks.join(" ").slice(0, 8000);

      response = await client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `以下は履歴書・職務経歴書のテキストです。情報を抽出してください。\n\n${extractedText || "（テキストの抽出に失敗しました）"}`,
          },
        ],
        max_tokens: 1000,
        response_format: { type: "json_object" },
      });
    }

    const content = response.choices[0]?.message?.content;
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
      companies: Array.isArray(parsed.companies) ? parsed.companies.filter((c: unknown) => typeof c === "string") : undefined,
      experienceYears: parsed.experienceYears != null ? String(parsed.experienceYears) : undefined,
      githubUrl: typeof parsed.githubUrl === "string" ? parsed.githubUrl : undefined,
    };

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("extract-resume error:", err);
    const status = (err as { status?: number })?.status;
    if (status === 401) return NextResponse.json({ error: "APIキーが無効です。.env.local を確認してください。" }, { status: 401 });
    if (status === 429) return NextResponse.json({ error: "OpenAI APIのクォータを超過しています。残高を確認してください。" }, { status: 429 });
    return NextResponse.json({ error: "AI読み取りに失敗しました。" }, { status: 500 });
  }
}
