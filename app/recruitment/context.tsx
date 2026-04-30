"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Candidate, CandidateStatus, EmailHistory, EmailTemplate, FlowTemplate, HireGoal, InterviewQuestion, InterviewStage, SlackChannelConfig, SlackNotification } from "./types";
import { mockCandidates, mockInterviewStages, mockSlackNotifications, mockEmailHistories, mockInterviewQuestions } from "./mockData";
import { INTERVIEWER_OPTIONS } from "./constants";
import { deriveCandidateStatusFromFlow } from "./statusUtils";

const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "et001",
    name: "書類選考通過のご連絡",
    subject: "【採用選考】書類選考通過のご連絡",
    body: "この度は弊社の求人にご応募いただき、誠にありがとうございます。\n書類選考の結果、次のステップである面接にお進みいただきたく、ご連絡申し上げます。\n\nつきましては、面接の日程について下記よりお知らせいただけますでしょうか。\n\nご不明な点がございましたら、お気軽にご連絡ください。\n何卒よろしくお願いいたします。",
    category: "書類選考",
  },
  {
    id: "et002",
    name: "面接日程のご案内",
    subject: "【採用選考】面接日程のご案内",
    body: "この度はご応募いただきありがとうございます。\n面接の日程についてご案内いたします。\n\n■日時：\n■場所：\n■担当者：\n\nご不明な点がございましたら、お気軽にご連絡ください。",
    category: "面接案内",
  },
  {
    id: "et003",
    name: "内定通知",
    subject: "【採用選考】内定のご通知",
    body: "この度は弊社の採用選考にご参加いただき、誠にありがとうございました。\n慎重に検討した結果、あなたを採用させていただくことになりましたので、ご連絡申し上げます。\n\n入社日・条件等の詳細につきましては、別途書面にてご連絡いたします。\nご入社を心よりお待ちしております。",
    category: "内定",
  },
  {
    id: "et004",
    name: "不採用通知",
    subject: "【採用選考】選考結果のご連絡",
    body: "この度は弊社の採用選考にご参加いただき、誠にありがとうございました。\n慎重に検討した結果、誠に残念ながら今回はご期待に沿えない結果となりました。\n\n厳選なる選考の結果であり、あなたのご経歴・ご能力を否定するものではございません。\n今後のご活躍を心よりお祈り申し上げます。",
    category: "合否通知",
  },
];

const DEFAULT_SLACK_CHANNEL_CONFIG: SlackChannelConfig = {
  statusChange: "#採用チャンネル",
  interviewAssign: "#採用チャンネル",
  offerDecision: "#採用チャンネル",
};

type RecruitmentContextType = {
  candidates: Candidate[];
  updateCandidate: (updated: Candidate) => void;
  addCandidate: (candidate: Candidate) => void;
  deleteCandidate: (id: string) => void;
  archiveCandidate: (id: string) => void;
  unarchiveCandidate: (id: string) => void;
  duplicateCandidate: (id: string) => void;
  bulkUpdateStatus: (ids: string[], status: CandidateStatus) => void;
  interviewStages: InterviewStage[];
  setInterviewStages: (stages: InterviewStage[]) => void;
  slackNotifications: SlackNotification[];
  addSlackNotifications: (notifications: SlackNotification[]) => void;
  emailHistories: EmailHistory[];
  addEmailHistory: (history: EmailHistory) => void;
  interviewQuestions: InterviewQuestion[];
  addInterviewQuestion: (q: InterviewQuestion) => void;
  deleteInterviewQuestion: (id: string) => void;
  interviewers: string[];
  addInterviewer: (name: string) => void;
  removeInterviewer: (name: string) => void;
  interviewerMentions: Record<string, string>;
  updateInterviewerMention: (name: string, mention: string) => void;
  getInterviewerMention: (name: string) => string;
  emailTemplates: EmailTemplate[];
  addEmailTemplate: (t: EmailTemplate) => void;
  updateEmailTemplate: (t: EmailTemplate) => void;
  deleteEmailTemplate: (id: string) => void;
  hireGoals: HireGoal[];
  setHireGoals: (goals: HireGoal[]) => void;
  flowTemplates: FlowTemplate[];
  addFlowTemplate: (t: FlowTemplate) => void;
  deleteFlowTemplate: (id: string) => void;
  slackChannelConfig: SlackChannelConfig;
  setSlackChannelConfig: (config: SlackChannelConfig) => void;
};

const RecruitmentContext = createContext<RecruitmentContextType | null>(null);
const STORAGE_KEY = "recruitment-data-v2";

type StoredRecruitmentData = {
  candidates: Candidate[];
  interviewStages: InterviewStage[];
  slackNotifications: SlackNotification[];
  emailHistories: EmailHistory[];
  interviewQuestions: InterviewQuestion[];
  interviewers: string[];
  interviewerMentions?: Record<string, string>;
  emailTemplates?: EmailTemplate[];
  hireGoals?: HireGoal[];
  flowTemplates?: FlowTemplate[];
  slackChannelConfig?: SlackChannelConfig;
};

function isStoredRecruitmentData(value: unknown): value is StoredRecruitmentData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    Array.isArray(data.candidates) &&
    Array.isArray(data.interviewStages) &&
    Array.isArray(data.slackNotifications) &&
    Array.isArray(data.interviewQuestions) &&
    Array.isArray(data.interviewers)
  );
}

function syncCandidateStatuses(candidates: Candidate[], stages: InterviewStage[]): Candidate[] {
  return candidates.map((candidate) => ({
    ...candidate,
    status: deriveCandidateStatusFromFlow(candidate.interviewRecords, stages, candidate.status),
  }));
}

export function RecruitmentProvider({ children }: { children: React.ReactNode }) {
  const [candidates, setCandidates] = useState<Candidate[]>(() => syncCandidateStatuses(mockCandidates, mockInterviewStages));
  const [interviewStages, setInterviewStages] = useState<InterviewStage[]>(mockInterviewStages);
  const [slackNotifications, setSlackNotifications] = useState<SlackNotification[]>(mockSlackNotifications);
  const [emailHistories, setEmailHistories] = useState<EmailHistory[]>(mockEmailHistories);
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>(mockInterviewQuestions);
  const [interviewers, setInterviewers] = useState<string[]>([...INTERVIEWER_OPTIONS]);
  const [interviewerMentions, setInterviewerMentions] = useState<Record<string, string>>({});
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(DEFAULT_EMAIL_TEMPLATES);
  const [hireGoals, setHireGoals] = useState<HireGoal[]>([]);
  const [flowTemplates, setFlowTemplates] = useState<FlowTemplate[]>([]);
  const [slackChannelConfig, setSlackChannelConfig] = useState<SlackChannelConfig>(DEFAULT_SLACK_CHANNEL_CONFIG);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  useEffect(() => {
    async function loadStoredData() {
      let localData: StoredRecruitmentData | null = null;

      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (isStoredRecruitmentData(parsed)) localData = parsed;
        }
      } catch (error) {
        console.error("Failed to load recruitment data from localStorage", error);
      }

      try {
        const response = await fetch("/api/recruitment-state");
        if (response.ok) {
          const result = await response.json();
          if (isStoredRecruitmentData(result.data)) {
            applyStoredData(result.data);
            return;
          }
        }
      } catch (error) {
        console.error("Failed to load recruitment data from Supabase", error);
      } finally {
        setHasLoadedStorage(true);
      }

      if (localData) applyStoredData(localData);
    }

    function applyStoredData(data: StoredRecruitmentData) {
      setCandidates(syncCandidateStatuses(data.candidates, data.interviewStages));
      setInterviewStages(data.interviewStages);
      setSlackNotifications(data.slackNotifications);
      if (Array.isArray(data.emailHistories)) setEmailHistories(data.emailHistories);
      setInterviewQuestions(data.interviewQuestions);
      setInterviewers(data.interviewers);
      setInterviewerMentions(data.interviewerMentions ?? {});
      if (data.emailTemplates?.length) setEmailTemplates(data.emailTemplates);
      if (data.hireGoals) setHireGoals(data.hireGoals);
      if (data.flowTemplates) setFlowTemplates(data.flowTemplates);
      if (data.slackChannelConfig) setSlackChannelConfig(data.slackChannelConfig);
    }

    loadStoredData();
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) return;

    const data: StoredRecruitmentData = {
      candidates,
      interviewStages,
      slackNotifications,
      emailHistories,
      interviewQuestions,
      interviewers,
      interviewerMentions,
      emailTemplates,
      hireGoals,
      flowTemplates,
      slackChannelConfig,
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save recruitment data to localStorage", error);
    }

    const timeoutId = window.setTimeout(() => {
      fetch("/api/recruitment-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).catch((error) => {
        console.error("Failed to save recruitment data to Supabase", error);
      });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [candidates, emailHistories, emailTemplates, flowTemplates, hasLoadedStorage, hireGoals, interviewerMentions, interviewQuestions, interviewStages, interviewers, slackChannelConfig, slackNotifications]);

  function updateCandidate(updated: Candidate) {
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === updated.id
          ? { ...updated, status: deriveCandidateStatusFromFlow(updated.interviewRecords, interviewStages, updated.status) }
          : c
      )
    );
  }

  function addCandidate(candidate: Candidate) {
    const timestamp = formatTimestamp(new Date());
    const notification: SlackNotification = {
      id: crypto.randomUUID(),
      candidateId: candidate.id,
      candidateName: candidate.name,
      sentAt: timestamp,
      channel: slackChannelConfig.statusChange,
      message: `${candidate.name}さんが「${candidate.position}」に応募者登録されました。`,
    };

    setCandidates((prev) => [
      { ...candidate, status: deriveCandidateStatusFromFlow(candidate.interviewRecords, interviewStages, candidate.status) },
      ...prev,
    ]);
    addSlackNotifications([notification]);
  }

  function deleteCandidate(id: string) {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  }

  function archiveCandidate(id: string) {
    const today = new Date().toISOString().slice(0, 10);
    setCandidates((prev) => prev.map((c) => c.id === id ? { ...c, archivedAt: today } : c));
  }

  function unarchiveCandidate(id: string) {
    setCandidates((prev) => prev.map((c) => c.id === id ? { ...c, archivedAt: undefined } : c));
  }

  function duplicateCandidate(id: string) {
    const original = candidates.find((c) => c.id === id);
    if (!original) return;
    const today = new Date().toISOString().slice(0, 10);
    const copy: Candidate = {
      ...original,
      id: crypto.randomUUID(),
      name: `${original.name}（コピー）`,
      status: "応募受付",
      appliedAt: today,
      updatedAt: today,
      interviewRecords: [],
      archivedAt: undefined,
    };
    setCandidates((prev) => [copy, ...prev]);
  }

  function bulkUpdateStatus(ids: string[], status: CandidateStatus) {
    const today = new Date().toISOString().slice(0, 10);
    setCandidates((prev) =>
      prev.map((c) => ids.includes(c.id) ? { ...c, status, updatedAt: today } : c)
    );
  }

  function updateInterviewStages(stages: InterviewStage[]) {
    setInterviewStages(stages);
    setCandidates((prev) => syncCandidateStatuses(prev, stages));
  }

  function addSlackNotifications(notifications: SlackNotification[]) {
    if (notifications.length === 0) return;
    setSlackNotifications((prev) => [...prev, ...notifications]);
    fetch("/api/slack-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifications }),
    }).catch((error) => {
      console.error("Failed to send Slack notifications", error);
    });
  }

  function addEmailHistory(history: EmailHistory) {
    setEmailHistories((prev) => [history, ...prev]);
  }

  function addInterviewQuestion(q: InterviewQuestion) {
    setInterviewQuestions((prev) => [q, ...prev]);
  }

  function deleteInterviewQuestion(id: string) {
    setInterviewQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function addInterviewer(name: string) {
    setInterviewers((prev) => prev.includes(name) ? prev : [...prev, name]);
  }

  function removeInterviewer(name: string) {
    setInterviewers((prev) => prev.filter((i) => i !== name));
    setInterviewerMentions((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function updateInterviewerMention(name: string, mention: string) {
    setInterviewerMentions((prev) => ({ ...prev, [name]: mention.trim() }));
  }

  function getInterviewerMention(name: string) {
    const raw = interviewerMentions[name]?.trim();
    if (!raw) return `@${name}`;
    if (raw.startsWith("<@") && raw.endsWith(">")) return raw;
    if (/^[UW][A-Z0-9]{6,}$/i.test(raw)) return `<@${raw}>`;
    return raw;
  }

  function addEmailTemplate(t: EmailTemplate) {
    setEmailTemplates((prev) => [...prev, t]);
  }

  function updateEmailTemplate(t: EmailTemplate) {
    setEmailTemplates((prev) => prev.map((e) => e.id === t.id ? t : e));
  }

  function deleteEmailTemplate(id: string) {
    setEmailTemplates((prev) => prev.filter((e) => e.id !== id));
  }

  function addFlowTemplate(t: FlowTemplate) {
    setFlowTemplates((prev) => [...prev, t]);
  }

  function deleteFlowTemplate(id: string) {
    setFlowTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <RecruitmentContext.Provider
      value={{
        candidates,
        updateCandidate,
        addCandidate,
        deleteCandidate,
        archiveCandidate,
        unarchiveCandidate,
        duplicateCandidate,
        bulkUpdateStatus,
        interviewStages,
        setInterviewStages: updateInterviewStages,
        slackNotifications,
        addSlackNotifications,
        emailHistories,
        addEmailHistory,
        interviewQuestions,
        addInterviewQuestion,
        deleteInterviewQuestion,
        interviewers,
        addInterviewer,
        removeInterviewer,
        interviewerMentions,
        updateInterviewerMention,
        getInterviewerMention,
        emailTemplates,
        addEmailTemplate,
        updateEmailTemplate,
        deleteEmailTemplate,
        hireGoals,
        setHireGoals,
        flowTemplates,
        addFlowTemplate,
        deleteFlowTemplate,
        slackChannelConfig,
        setSlackChannelConfig,
      }}
    >
      {children}
    </RecruitmentContext.Provider>
  );
}

function formatTimestamp(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function useRecruitment() {
  const ctx = useContext(RecruitmentContext);
  if (!ctx) throw new Error("useRecruitment must be used within RecruitmentProvider");
  return ctx;
}
