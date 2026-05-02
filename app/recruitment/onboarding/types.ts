export type OnboardingStatus = "未開始" | "進行中" | "完了" | "要フォロー";
export type MemberCondition = "良好" | "普通" | "不安あり" | "要対応";
export type RetentionRisk = "低" | "中" | "高";
export type OjtDifficulty = "低" | "中" | "高";
export type OjtProgress = "未着手" | "作業中" | "レビュー中" | "完了";
export type ShareWithManager = "必要" | "不要";

export type OnboardingMember = {
  id: string;
  candidateId?: string;
  name: string;
  position: string;
  joinedAt: string;
  department: string;
  mentor: string;
  ojtOwner: string;
  onboardingStatus: OnboardingStatus;
  condition: MemberCondition | null;
  retentionRisk: RetentionRisk | null;
  memo: string;
  updatedAt: string;
};

export type TrainingRecord = {
  id: string;
  memberId: string;
  trainingName: string;
  trainedAt: string;
  trainer: string;
  content: string;
  understandingLevel: 1 | 2 | 3 | 4 | 5;
  deliverableUrl: string;
  goodPoint: string;
  issuePoint: string;
  nextAction: string;
};

export type OjtRecord = {
  id: string;
  memberId: string;
  recordedAt: string;
  projectName: string;
  taskName: string;
  difficulty: OjtDifficulty;
  progress: OjtProgress;
  reviewer: string;
  blocker: string;
  feedback: string;
  selfUnderstandingLevel: 1 | 2 | 3 | 4 | 5;
  reviewerComment: string;
};

export type DailyReport = {
  id: string;
  memberId: string;
  reportedAt: string;
  didToday: string;
  learned: string;
  blocked: string;
  nextPlan: string;
  consultation: string;
  conditionScore: 1 | 2 | 3 | 4 | 5;
  workloadScore: 1 | 2 | 3 | 4 | 5;
  isolationScore: 1 | 2 | 3 | 4 | 5;
  confidenceScore: 1 | 2 | 3 | 4 | 5;
};

export type MentorMeeting = {
  id: string;
  memberId: string;
  meetingAt: string;
  mentor: string;
  workCondition: MemberCondition;
  mentalCondition: MemberCondition;
  consultation: string;
  mentorComment: string;
  nextAction: string;
  shareWithManager: ShareWithManager;
  risk: RetentionRisk;
};

export type OnboardingSlackNotification = {
  id: string;
  memberId: string;
  memberName: string;
  sentAt: string;
  channel: string;
  message: string;
};

export type ConditionFilterValue = "すべて" | MemberCondition;
export type RiskFilterValue = "すべて" | RetentionRisk;
