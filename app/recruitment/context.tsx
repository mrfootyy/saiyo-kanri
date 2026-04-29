"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Candidate, InterviewQuestion, InterviewStage, SlackNotification } from "./types";
import { mockCandidates, mockInterviewStages, mockSlackNotifications, mockEmailHistories, mockInterviewQuestions } from "./mockData";
import { INTERVIEWER_OPTIONS } from "./constants";
import { deriveCandidateStatusFromFlow } from "./statusUtils";
import type { EmailHistory } from "./types";

type RecruitmentContextType = {
  candidates: Candidate[];
  updateCandidate: (updated: Candidate) => void;
  addCandidate: (candidate: Candidate) => void;
  interviewStages: InterviewStage[];
  setInterviewStages: (stages: InterviewStage[]) => void;
  slackNotifications: SlackNotification[];
  addSlackNotifications: (notifications: SlackNotification[]) => void;
  emailHistories: EmailHistory[];
  interviewQuestions: InterviewQuestion[];
  addInterviewQuestion: (q: InterviewQuestion) => void;
  deleteInterviewQuestion: (id: string) => void;
  interviewers: string[];
  addInterviewer: (name: string) => void;
  removeInterviewer: (name: string) => void;
};

const RecruitmentContext = createContext<RecruitmentContextType | null>(null);
const STORAGE_KEY = "recruitment-data-v1";

type StoredRecruitmentData = {
  candidates: Candidate[];
  interviewStages: InterviewStage[];
  slackNotifications: SlackNotification[];
  interviewQuestions: InterviewQuestion[];
  interviewers: string[];
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
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>(mockInterviewQuestions);
  const [interviewers, setInterviewers] = useState<string[]>([...INTERVIEWER_OPTIONS]);
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
            setCandidates(syncCandidateStatuses(result.data.candidates, result.data.interviewStages));
            setInterviewStages(result.data.interviewStages);
            setSlackNotifications(result.data.slackNotifications);
            setInterviewQuestions(result.data.interviewQuestions);
            setInterviewers(result.data.interviewers);
            return;
          }
        }
      } catch (error) {
        console.error("Failed to load recruitment data from Supabase", error);
      } finally {
        setHasLoadedStorage(true);
      }

      if (localData) {
        setCandidates(syncCandidateStatuses(localData.candidates, localData.interviewStages));
        setInterviewStages(localData.interviewStages);
        setSlackNotifications(localData.slackNotifications);
        setInterviewQuestions(localData.interviewQuestions);
        setInterviewers(localData.interviewers);
      }
    }

    loadStoredData();
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) return;

    const data: StoredRecruitmentData = {
      candidates,
      interviewStages,
      slackNotifications,
      interviewQuestions,
      interviewers,
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
  }, [candidates, hasLoadedStorage, interviewQuestions, interviewStages, interviewers, slackNotifications]);

  function updateCandidate(updated: Candidate) {
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === updated.id
          ? {
              ...updated,
              status: deriveCandidateStatusFromFlow(updated.interviewRecords, interviewStages, updated.status),
            }
          : c
      )
    );
  }

  function addCandidate(candidate: Candidate) {
    setCandidates((prev) => [
      {
        ...candidate,
        status: deriveCandidateStatusFromFlow(candidate.interviewRecords, interviewStages, candidate.status),
      },
      ...prev,
    ]);
  }

  function updateInterviewStages(stages: InterviewStage[]) {
    setInterviewStages(stages);
    setCandidates((prev) => syncCandidateStatuses(prev, stages));
  }

  function addSlackNotifications(notifications: SlackNotification[]) {
    setSlackNotifications((prev) => [...prev, ...notifications]);
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
  }

  return (
    <RecruitmentContext.Provider
      value={{
        candidates,
        updateCandidate,
        addCandidate,
        interviewStages,
        setInterviewStages: updateInterviewStages,
        slackNotifications,
        addSlackNotifications,
        emailHistories: mockEmailHistories,
        interviewQuestions,
        addInterviewQuestion,
        deleteInterviewQuestion,
        interviewers,
        addInterviewer,
        removeInterviewer,
      }}
    >
      {children}
    </RecruitmentContext.Provider>
  );
}

export function useRecruitment() {
  const ctx = useContext(RecruitmentContext);
  if (!ctx) throw new Error("useRecruitment must be used within RecruitmentProvider");
  return ctx;
}
