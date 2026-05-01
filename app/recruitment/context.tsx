"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Candidate, CandidateStatus, EmailHistory, EmailTemplate, FlowTemplate, HireGoal, InterviewRecord, InterviewQuestion, InterviewStage, SlackChannelConfig, SlackNotification } from "./types";
import { mockCandidates, mockInterviewStages, mockSlackNotifications, mockEmailHistories, mockInterviewQuestions } from "./mockData";
import { DEFAULT_POSITION_OPTION, INTERVIEWER_OPTIONS, POSITION_OPTIONS } from "./constants";
import { deriveCandidateStatusFromFlow } from "./statusUtils";
import { authFetch } from "../../lib/authFetch";

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
  webhookUrl: "",
  statusChange: "#採用チャンネル",
  interviewAssign: "#採用チャンネル",
  offerDecision: "#採用チャンネル",
};

const EVALUATION_REMINDER_PREFIX = "evaluation-reminder";

type RecruitmentContextType = {
  candidates: Candidate[];
  updateCandidate: (updated: Candidate) => void;
  addCandidate: (candidate: Candidate) => void;
  addCandidates: (candidates: Candidate[]) => void;
  deleteCandidate: (id: string) => void;
  bulkUpdateStatus: (ids: string[], status: CandidateStatus) => void;
  interviewStages: InterviewStage[];
  setInterviewStages: (stages: InterviewStage[]) => void;
  slackNotifications: SlackNotification[];
  addSlackNotifications: (notifications: SlackNotification[]) => void;
  clearSlackNotifications: () => void;
  emailHistories: EmailHistory[];
  addEmailHistory: (history: EmailHistory) => void;
  clearEmailHistories: () => void;
  interviewQuestions: InterviewQuestion[];
  addInterviewQuestion: (q: InterviewQuestion) => void;
  updateInterviewQuestion: (q: InterviewQuestion) => void;
  deleteInterviewQuestion: (id: string) => void;
  positionOptions: string[];
  addPositionOption: (name: string) => void;
  removePositionOption: (name: string) => void;
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
  positionOptions?: string[];
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

function normalizePositionOptions(options?: string[]) {
  const normalized = [DEFAULT_POSITION_OPTION, ...(options ?? POSITION_OPTIONS)]
    .map((position) => position.trim())
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function syncCandidateStatuses(candidates: Candidate[], stages: InterviewStage[]): Candidate[] {
  return candidates.map((candidate) => ({
    ...candidate,
    status: deriveCandidateStatusFromFlow(candidate.interviewRecords, stages, candidate.status),
  }));
}

function stripInterviewRecordAudio(record: InterviewRecord): InterviewRecord {
  if (!record.audioSummary?.dataUrl) return record;
  const { dataUrl: _dataUrl, ...audioSummary } = record.audioSummary;
  return { ...record, audioSummary };
}

function stripCandidateFiles(candidate: Candidate): Candidate {
  const { resumeFile: _resumeFile, cvFile: _cvFile, portfolioFile: _portfolioFile, ...rest } = candidate;
  return {
    ...rest,
    interviewRecords: rest.interviewRecords.map(stripInterviewRecordAudio),
  };
}

function mergeLocalCandidateFiles(remoteCandidates: Candidate[], localCandidates: Candidate[]): Candidate[] {
  const localById = new Map(localCandidates.map((candidate) => [candidate.id, candidate]));
  return remoteCandidates.map((candidate) => {
    const local = localById.get(candidate.id);
    if (!local) return candidate;
    return {
      ...candidate,
      resumeFile: candidate.resumeFile ?? local.resumeFile,
      cvFile: candidate.cvFile ?? local.cvFile,
      portfolioFile: candidate.portfolioFile ?? local.portfolioFile,
      interviewRecords: candidate.interviewRecords.map((record) => {
        const localRecord = local.interviewRecords.find((item) => item.id === record.id);
        if (!localRecord?.audioSummary?.dataUrl || !record.audioSummary) return record;
        return {
          ...record,
          audioSummary: {
            ...record.audioSummary,
            dataUrl: record.audioSummary.dataUrl ?? localRecord.audioSummary.dataUrl,
          },
        };
      }),
    };
  });
}

export function RecruitmentProvider({ children }: { children: React.ReactNode }) {
  const [candidates, setCandidates] = useState<Candidate[]>(() => syncCandidateStatuses(mockCandidates, mockInterviewStages));
  const [interviewStages, setInterviewStages] = useState<InterviewStage[]>(mockInterviewStages);
  const [slackNotifications, setSlackNotifications] = useState<SlackNotification[]>(mockSlackNotifications);
  const [emailHistories, setEmailHistories] = useState<EmailHistory[]>(mockEmailHistories);
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>(mockInterviewQuestions);
  const [positionOptions, setPositionOptions] = useState<string[]>([...POSITION_OPTIONS]);
  const [interviewers, setInterviewers] = useState<string[]>([...INTERVIEWER_OPTIONS]);
  const [interviewerMentions, setInterviewerMentions] = useState<Record<string, string>>({});
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(DEFAULT_EMAIL_TEMPLATES);
  const [hireGoals, setHireGoals] = useState<HireGoal[]>([]);
  const [flowTemplates, setFlowTemplates] = useState<FlowTemplate[]>([]);
  const [slackChannelConfig, setSlackChannelConfig] = useState<SlackChannelConfig>(DEFAULT_SLACK_CHANNEL_CONFIG);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const sentEvaluationReminderIds = useRef(new Set<string>());

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
        const response = await authFetch("/api/recruitment-state");
        if (response.ok) {
          const result = await response.json();
          if (isStoredRecruitmentData(result.data)) {
            applyStoredData({
              ...result.data,
              candidates: mergeLocalCandidateFiles(result.data.candidates, localData?.candidates ?? []),
            });
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
      setPositionOptions(normalizePositionOptions(data.positionOptions));
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
      positionOptions,
      interviewers,
      interviewerMentions,
      emailTemplates,
      hireGoals,
      flowTemplates,
      slackChannelConfig,
    };
    const remoteData: StoredRecruitmentData = {
      ...data,
      candidates: data.candidates.map(stripCandidateFiles),
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save recruitment data to localStorage", error);
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await authFetch("/api/recruitment-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(remoteData),
        });
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(result?.error ?? "Failed to save recruitment data.");
        }
      } catch (error) {
        console.error("Failed to save recruitment data to Supabase", error);
      }
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [candidates, emailHistories, emailTemplates, flowTemplates, hasLoadedStorage, hireGoals, interviewerMentions, interviewQuestions, interviewStages, interviewers, positionOptions, slackChannelConfig, slackNotifications]);

  useEffect(() => {
    if (!hasLoadedStorage) return;

    const existingNotificationIds = new Set(slackNotifications.map((notification) => notification.id));
    const reminders = buildEvaluationReminderNotifications(
      candidates,
      interviewStages,
      slackChannelConfig,
      getInterviewerMention,
      existingNotificationIds,
      sentEvaluationReminderIds.current
    );

    if (reminders.length === 0) return;
    reminders.forEach((notification) => sentEvaluationReminderIds.current.add(notification.id));
    addSlackNotifications(reminders);
  }, [candidates, hasLoadedStorage, interviewStages, interviewerMentions, slackChannelConfig, slackNotifications]);

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

  function addCandidates(newCandidates: Candidate[]) {
    if (newCandidates.length === 0) return;
    setCandidates((prev) => [
      ...newCandidates.map((candidate) => ({
        ...candidate,
        status: deriveCandidateStatusFromFlow(candidate.interviewRecords, interviewStages, candidate.status),
      })),
      ...prev,
    ]);
  }

  function deleteCandidate(id: string) {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
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
    authFetch("/api/slack-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifications, webhookUrl: slackChannelConfig.webhookUrl || undefined }),
    }).then(async (response) => {
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error ?? "Failed to send Slack notifications.");
      }
    }).catch((error) => {
      console.error("Failed to send Slack notifications", error);
    });
  }

  function clearSlackNotifications() {
    setSlackNotifications([]);
  }

  function addEmailHistory(history: EmailHistory) {
    setEmailHistories((prev) => [history, ...prev]);
  }

  function clearEmailHistories() {
    setEmailHistories([]);
  }

  function addInterviewQuestion(q: InterviewQuestion) {
    setInterviewQuestions((prev) => [q, ...prev]);
  }

  function updateInterviewQuestion(q: InterviewQuestion) {
    setInterviewQuestions((prev) => prev.map((item) => item.id === q.id ? q : item));
  }

  function deleteInterviewQuestion(id: string) {
    setInterviewQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function addPositionOption(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPositionOptions((prev) => prev.includes(trimmed) ? prev : [...prev, trimmed]);
  }

  function removePositionOption(name: string) {
    if (name === DEFAULT_POSITION_OPTION) return;
    setPositionOptions((prev) => {
      const next = prev.filter((position) => position !== name);
      return next.length > 0 ? next : [DEFAULT_POSITION_OPTION];
    });
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
        addCandidates,
        deleteCandidate,
        bulkUpdateStatus,
        interviewStages,
        setInterviewStages: updateInterviewStages,
        slackNotifications,
        addSlackNotifications,
        clearSlackNotifications,
        emailHistories,
        addEmailHistory,
        clearEmailHistories,
        interviewQuestions,
        addInterviewQuestion,
        updateInterviewQuestion,
        deleteInterviewQuestion,
        positionOptions,
        addPositionOption,
        removePositionOption,
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

function buildEvaluationReminderNotifications(
  candidates: Candidate[],
  interviewStages: InterviewStage[],
  slackChannelConfig: SlackChannelConfig,
  getInterviewerMention: (name: string) => string,
  existingNotificationIds: Set<string>,
  pendingNotificationIds: Set<string>
): SlackNotification[] {
  const today = startOfDay(new Date());
  const stageById = new Map(interviewStages.map((stage) => [stage.id, stage]));
  const timestamp = formatTimestamp(new Date());

  return candidates.flatMap((candidate) => {
    if (candidate.archivedAt) return [];

    return candidate.interviewRecords.flatMap((record) => {
      if (!isInterviewRecordForReminder(record, stageById)) return [];
      if (isEvaluationEntered(record)) return [];
      if (record.interviewers.length === 0) return [];

      const interviewDate = parseLocalDate(record.date);
      if (!interviewDate) return [];

      const mentions = record.interviewers.map((name) => getInterviewerMention(name)).join(" ");
      return [3, 5].flatMap((reminderBusinessDays) => {
        const deadline = addBusinessDays(interviewDate, reminderBusinessDays);
        if (today.getTime() <= deadline.getTime()) return [];

        const notificationId = buildEvaluationReminderId(candidate.id, record, reminderBusinessDays);
        if (existingNotificationIds.has(notificationId) || pendingNotificationIds.has(notificationId)) return [];

        const businessDaysOver = countBusinessDaysAfter(interviewDate, today) - reminderBusinessDays;
        const reminderLabel = reminderBusinessDays === 5 ? "再通知です。" : "";

        return [{
          id: notificationId,
          candidateId: candidate.id,
          candidateName: candidate.name,
          sentAt: timestamp,
          channel: slackChannelConfig.interviewAssign,
          message: `${mentions} ${reminderLabel}${candidate.name}さんの【${record.stageName}】は面接日（${record.date}）から${reminderBusinessDays}営業日を超えています。評価を記入してください。未記入のまま${businessDaysOver}営業日経過しています。`,
        }];
      });
    });
  });
}

function buildEvaluationReminderId(candidateId: string, record: InterviewRecord, reminderBusinessDays: number) {
  const stageKey = record.stageId ?? record.stageName;
  return `${EVALUATION_REMINDER_PREFIX}:${reminderBusinessDays}bd:${candidateId}:${stageKey}:${record.date}`;
}

function isInterviewRecordForReminder(record: InterviewRecord, stageById: Map<string, InterviewStage>) {
  const stage = record.stageId ? stageById.get(record.stageId) : undefined;
  const stageName = stage?.name ?? record.stageName;
  return !(stageName.includes("書類") || stageName.includes("適性") || stageName.includes("テスト"));
}

function isEvaluationEntered(record: InterviewRecord) {
  if (record.result !== null) return true;
  if (record.decisionReason?.trim()) return true;
  return record.evaluations?.some((item) => item.grade !== null || item.episode.trim()) ?? false;
}

function parseLocalDate(value: string) {
  const dateText = value.split(" ")[0]?.replace(/\//g, "-");
  if (!dateText) return null;
  const date = new Date(`${dateText}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : startOfDay(date);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addBusinessDays(date: Date, days: number) {
  const next = startOfDay(date);
  let added = 0;
  while (added < days) {
    next.setDate(next.getDate() + 1);
    if (isBusinessDay(next)) added++;
  }
  return next;
}

function countBusinessDaysAfter(start: Date, end: Date) {
  const cursor = startOfDay(start);
  const last = startOfDay(end);
  let count = 0;
  while (cursor < last) {
    cursor.setDate(cursor.getDate() + 1);
    if (isBusinessDay(cursor)) count++;
  }
  return count;
}

function isBusinessDay(date: Date) {
  const day = date.getDay();
  return day !== 0 && day !== 6 && !isJapaneseHoliday(date);
}

function isJapaneseHoliday(date: Date) {
  return getJapaneseHolidayKeys(date.getFullYear()).has(toDateKey(date));
}

function getJapaneseHolidayKeys(year: number) {
  const base = new Set<string>();
  const add = (month: number, day: number) => base.add(toDateKey(new Date(year, month - 1, day)));

  add(1, 1);
  add(2, 11);
  if (year >= 2020) add(2, 23);
  add(springEquinoxMonth(), springEquinoxDay(year));
  add(4, 29);
  add(5, 3);
  add(5, 4);
  add(5, 5);
  add(8, 11);
  add(autumnEquinoxMonth(), autumnEquinoxDay(year));
  add(11, 3);
  add(11, 23);

  addDate(base, nthWeekdayOfMonth(year, 1, 1, 2)); // 成人の日
  addDate(base, nthWeekdayOfMonth(year, 7, 1, 3)); // 海の日
  addDate(base, nthWeekdayOfMonth(year, 9, 1, 3)); // 敬老の日
  addDate(base, nthWeekdayOfMonth(year, 10, 1, 2)); // スポーツの日

  // 東京オリンピックに伴う特例。過去データの営業日計算用に残しています。
  if (year === 2020) {
    base.delete(toDateKey(new Date(2020, 6, 20)));
    base.delete(toDateKey(new Date(2020, 7, 11)));
    base.delete(toDateKey(new Date(2020, 9, 12)));
    addDate(base, new Date(2020, 6, 23));
    addDate(base, new Date(2020, 6, 24));
    addDate(base, new Date(2020, 7, 10));
  }
  if (year === 2021) {
    base.delete(toDateKey(new Date(2021, 6, 19)));
    base.delete(toDateKey(new Date(2021, 7, 11)));
    base.delete(toDateKey(new Date(2021, 9, 11)));
    addDate(base, new Date(2021, 6, 22));
    addDate(base, new Date(2021, 6, 23));
    addDate(base, new Date(2021, 7, 8));
  }

  const holidays = new Set(base);
  for (const key of Array.from(base).sort()) {
    const holiday = parseLocalDate(key);
    if (!holiday || holiday.getDay() !== 0) continue;
    const substitute = new Date(holiday);
    do {
      substitute.setDate(substitute.getDate() + 1);
    } while (holidays.has(toDateKey(substitute)));
    if (substitute.getFullYear() === year) holidays.add(toDateKey(substitute));
  }

  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 2; day < daysInMonth; day++) {
      const current = new Date(year, month, day);
      const key = toDateKey(current);
      if (holidays.has(key)) continue;
      const previous = new Date(current);
      previous.setDate(current.getDate() - 1);
      const next = new Date(current);
      next.setDate(current.getDate() + 1);
      if (holidays.has(toDateKey(previous)) && holidays.has(toDateKey(next))) {
        holidays.add(key);
      }
    }
  }

  return holidays;
}

function springEquinoxMonth() {
  return 3;
}

function autumnEquinoxMonth() {
  return 9;
}

function springEquinoxDay(year: number) {
  if (year <= 2099) return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  return 20;
}

function autumnEquinoxDay(year: number) {
  if (year <= 2099) return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  return 23;
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number) {
  const date = new Date(year, month - 1, 1);
  const offset = (weekday - date.getDay() + 7) % 7;
  return new Date(year, month - 1, 1 + offset + (nth - 1) * 7);
}

function addDate(set: Set<string>, date: Date) {
  set.add(toDateKey(date));
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function useRecruitment() {
  const ctx = useContext(RecruitmentContext);
  if (!ctx) throw new Error("useRecruitment must be used within RecruitmentProvider");
  return ctx;
}
