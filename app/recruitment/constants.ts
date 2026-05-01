import type { CandidateStatus } from "./types";

export const ACTIVE_STATUSES: CandidateStatus[] = ["応募受付", "書類選考", "一次面接", "最終面接"];

export const DEFAULT_POSITION_OPTION = "UIデザイナー";

export const POSITION_OPTIONS = [
  DEFAULT_POSITION_OPTION,
  "フロントエンドエンジニア",
  "バックエンドエンジニア",
  "フルスタックエンジニア",
  "インフラエンジニア",
  "モバイルエンジニア",
  "データサイエンティスト",
  "プロダクトマネージャー",
  "UXデザイナー",
  "グラフィックデザイナー",
  "マーケター",
  "セールス",
  "カスタマーサクセス",
  "コーポレート",
  "その他",
] as const;

export const INTERVIEWER_OPTIONS = [
  "田中部長",
  "中田さん",
  "木村CEO",
  "山本デザイン部長",
  "鈴木HR",
  "伊藤CTO",
  "渡辺マネージャー",
] as const;

export const INTERVIEW_FORMAT_OPTIONS = ["オンライン", "対面"] as const;

export type StageTypeDef = {
  name: string;
  hasInterviewers: boolean;
  hasFormat: boolean;
  defaultDescription: string;
};

export const STAGE_TYPE_OPTIONS: StageTypeDef[] = [
  { name: "書類選考",        hasInterviewers: false, hasFormat: false, defaultDescription: "書類・ポートフォリオによる一次スクリーニング" },
  { name: "適性検査",        hasInterviewers: false, hasFormat: false, defaultDescription: "性格・能力の適性検査" },
  { name: "コーディングテスト", hasInterviewers: false, hasFormat: false, defaultDescription: "技術力・問題解決能力の客観的評価" },
  { name: "カジュアル面談",   hasInterviewers: true,  hasFormat: true,  defaultDescription: "企業・候補者の相互理解を深めるカジュアルな場" },
  { name: "一次面接",        hasInterviewers: true,  hasFormat: true,  defaultDescription: "基本的なスキルとカルチャーフィットの確認" },
  { name: "二次面接",        hasInterviewers: true,  hasFormat: true,  defaultDescription: "より深い技術力・人物評価" },
  { name: "最終面接",        hasInterviewers: true,  hasFormat: true,  defaultDescription: "役員・経営陣との最終評価" },
  { name: "オファー面談",    hasInterviewers: true,  hasFormat: true,  defaultDescription: "条件提示・入社意向の確認" },
];

export const DEFAULT_EVALUATION_ITEMS = [
  "コミュニケーション能力",
  "ストレス耐性",
  "カルチャーフィット（メンタル面）",
  "カルチャーフィット（仕事面）",
  "志望度",
  "成長意欲",
];

const INTERVIEW_EVALUATION_BY_POSITION: Record<string, string[]> = {
  フロントエンドエンジニア: ["技術理解", "UI実装力", "設計力", "品質意識", "コミュニケーション"],
  バックエンドエンジニア: ["技術理解", "設計力", "データ設計", "運用・障害対応力", "コミュニケーション"],
  フルスタックエンジニア: ["技術理解", "フロント・バック連携力", "設計力", "プロダクト志向", "コミュニケーション"],
  インフラエンジニア: ["クラウド・インフラ知識", "セキュリティ意識", "運用設計", "障害対応力", "コミュニケーション"],
  モバイルエンジニア: ["技術理解", "アプリ品質意識", "UI実装力", "ストア運用理解", "コミュニケーション"],
  データサイエンティスト: ["分析設計力", "統計・機械学習理解", "ビジネス課題への翻訳力", "説明力", "コミュニケーション"],
  プロダクトマネージャー: ["課題設定力", "優先順位判断", "推進力", "ステークホルダー調整", "ユーザー理解"],
  UIデザイナー: ["UI設計力", "ビジュアル品質", "デザイン意図の説明力", "ユーザー理解", "コミュニケーション"],
  UXデザイナー: ["リサーチ設計力", "情報設計", "課題発見力", "プロトタイピング", "コミュニケーション"],
  グラフィックデザイナー: ["表現力", "ブランド理解", "制作スピード", "品質管理", "コミュニケーション"],
  マーケター: ["戦略設計", "分析力", "施策実行力", "仮説検証力", "コミュニケーション"],
  セールス: ["顧客理解", "提案力", "目標達成力", "関係構築力", "コミュニケーション"],
  カスタマーサクセス: ["顧客課題理解", "提案力", "継続支援力", "プロダクト理解", "コミュニケーション"],
  コーポレート: ["専門知識", "正確性", "改善提案力", "リスク管理", "コミュニケーション"],
};

// 書類選考の職種別評価項目
const DOCUMENT_EVALUATION_BASE = [
  "職務経歴の一貫性",
  "志望動機の明確さ",
  "必要スキルの充足度",
  "成長ポテンシャル",
  "カルチャーフィット",
];

const DOCUMENT_EVALUATION_BY_POSITION: Record<string, string[]> = {
  フロントエンドエンジニア:  ["職務経歴の一貫性", "フロントエンド技術スタック", "ポートフォリオ品質", "UI/UXへの関心", "志望動機の明確さ"],
  バックエンドエンジニア:    ["職務経歴の一貫性", "バックエンド技術スタック", "設計・アーキテクチャ経験", "パフォーマンス・スケーラビリティ意識", "志望動機の明確さ"],
  フルスタックエンジニア:    ["職務経歴の一貫性", "フロント・バック両面の技術力", "プロダクト志向の高さ", "ポートフォリオ品質", "志望動機の明確さ"],
  インフラエンジニア:        ["職務経歴の一貫性", "インフラ・クラウド経験", "セキュリティ意識", "運用・障害対応経験", "志望動機の明確さ"],
  モバイルエンジニア:        ["職務経歴の一貫性", "iOS/Android技術スタック", "ポートフォリオ品質", "UI品質へのこだわり", "志望動機の明確さ"],
  データサイエンティスト:    ["職務経歴の一貫性", "統計・機械学習の知識", "分析ツール・言語スキル", "ビジネス課題への翻訳力", "志望動機の明確さ"],
  プロダクトマネージャー:    ["職務経歴の一貫性", "プロダクト開発の実績", "データドリブンな意思決定経験", "ステークホルダー調整力", "志望動機の明確さ"],
  UIデザイナー:              ["職務経歴の一貫性", "ポートフォリオのビジュアル品質", "UIデザインツールスキル", "ユーザー視点の設計力", "志望動機の明確さ"],
  UXデザイナー:              ["職務経歴の一貫性", "ユーザーリサーチ経験", "情報設計・IA能力", "プロトタイピング能力", "志望動機の明確さ"],
  グラフィックデザイナー:    ["職務経歴の一貫性", "ポートフォリオのビジュアル品質", "ブランド・トンマナへの理解", "デザインツールスキル", "志望動機の明確さ"],
  マーケター:                ["職務経歴の一貫性", "デジタルマーケティング実績", "データ分析・KPI管理経験", "コンテンツ・企画力", "志望動機の明確さ"],
  セールス:                  ["職務経歴の一貫性", "営業実績・数字の具体性", "顧客折衝・提案力", "ターゲット業界知識", "志望動機の明確さ"],
  カスタマーサクセス:        ["職務経歴の一貫性", "顧客対応・CS実績", "課題解決・提案力", "プロダクト理解の深さ", "志望動機の明確さ"],
  コーポレート:              ["職務経歴の一貫性", "バックオフィス業務の専門性", "法務・財務・HR知識", "コンプライアンス意識", "志望動機の明確さ"],
};

export function getDocumentEvaluationItems(position: string): string[] {
  return DOCUMENT_EVALUATION_BY_POSITION[position] ?? DOCUMENT_EVALUATION_BASE;
}

export function getInterviewEvaluationItems(position: string): string[] {
  return INTERVIEW_EVALUATION_BY_POSITION[position] ?? DEFAULT_EVALUATION_ITEMS;
}
