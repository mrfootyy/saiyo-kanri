export type DocumentFile = {
  name: string;
  type: string;
  dataUrl: string;
};

export type CandidateStatus =
  | "応募受付"
  | "書類選考"
  | "一次面接"
  | "最終面接"
  | "内定"
  | "不採用"
  | "辞退";

export type Candidate = {
  id: string;
  name: string;
  nameKana: string;
  position: string;
  status: CandidateStatus;
  appliedAt: string;
  email: string;
  phone: string;
  age: string;
  interviewers: string[];
  memo: string;
  updatedAt: string;
  resumeFile?: DocumentFile;
  cvFile?: DocumentFile;
  portfolioUrl?: string;
  portfolioFile?: DocumentFile;
  skills?: string[];
  companies?: string[];
  experienceYears?: string;
  githubUrl?: string;
  interviewRecords: InterviewRecord[];
};

export type SlackNotification = {
  id: string;
  candidateId: string;
  candidateName: string;
  sentAt: string;
  channel: string;
  message: string;
};

export type EmailHistory = {
  id: string;
  candidateId: string;
  candidateName: string;
  sentAt: string;
  direction: "送信" | "受信";
  subject: string;
  summary: string;
};

export type StatusFilterValue = "すべて" | CandidateStatus;

export type InterviewRating = 1 | 2 | 3 | 4 | 5;
export type InterviewResult = "通過" | "保留" | "不採用";
export type EvaluationGrade = "5" | "4" | "3" | "2" | "1";

export type EvaluationItem = {
  name: string;
  grade: EvaluationGrade | null;
  episode: string;
};

export type InterviewRecord = {
  id: string;
  stageName: string;
  date: string;
  interviewers: string[];
  notes: string;
  rating: InterviewRating | null;
  result: InterviewResult | null;
  evaluations?: EvaluationItem[];
  decisionReason?: string;
  format?: InterviewFormat;
  zoomUrl?: string;
};

export type InterviewFormat = "オンライン" | "対面";

export type InterviewQuestion = {
  id: string;
  stage: string;
  tags: string[];
  text: string;
  modelAnswer: string;
};

export type InterviewStage = {
  id: string;
  name: string;
  order: number;
  interviewers: string[];
  format: InterviewFormat;
  durationMinutes: number;
  description: string;
};
