export type ExtractedCompany = { name: string; years: string };

export type ExtractedInfo = {
  email?: string;
  phone?: string;
  age?: string;
  skills?: string[];
  companies?: ExtractedCompany[];
  githubUrl?: string;
};

export type ExtractError = { message: string };

export async function extractFromFile(
  dataUrl: string,
  fileType: string
): Promise<ExtractedInfo | ExtractError> {
  try {
    const res = await fetch("/api/extract-resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl, fileType }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { message: data.error ?? "AI読み取りに失敗しました。" };
    }

    return data as ExtractedInfo;
  } catch {
    return { message: "ネットワークエラーが発生しました。" };
  }
}

export function isExtractError(v: ExtractedInfo | ExtractError): v is ExtractError {
  return "message" in v;
}
