"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authFetch } from "../../../lib/authFetch";
import type {
  OnboardingMember,
  TrainingRecord,
  OjtRecord,
  DailyReport,
  MentorMeeting,
  OnboardingSlackNotification,
} from "./types";
import {
  mockMembers,
  mockTrainingRecords,
  mockOjtRecords,
  mockDailyReports,
  mockMentorMeetings,
  mockSlackNotifications,
} from "./mockData";

type OnboardingData = {
  members: OnboardingMember[];
  trainingRecords: TrainingRecord[];
  ojtRecords: OjtRecord[];
  dailyReports: DailyReport[];
  mentorMeetings: MentorMeeting[];
  slackNotifications: OnboardingSlackNotification[];
};

type OnboardingContextType = {
  members: OnboardingMember[];
  trainingRecords: TrainingRecord[];
  ojtRecords: OjtRecord[];
  dailyReports: DailyReport[];
  mentorMeetings: MentorMeeting[];
  slackNotifications: OnboardingSlackNotification[];
  addMember: (m: OnboardingMember) => void;
  updateMember: (m: OnboardingMember) => void;
  removeMember: (id: string) => void;
  addTrainingRecord: (r: TrainingRecord) => void;
  updateTrainingRecord: (r: TrainingRecord) => void;
  deleteTrainingRecord: (id: string) => void;
  addOjtRecord: (r: OjtRecord) => void;
  updateOjtRecord: (r: OjtRecord) => void;
  deleteOjtRecord: (id: string) => void;
  addDailyReport: (r: DailyReport) => void;
  updateDailyReport: (r: DailyReport) => void;
  deleteDailyReport: (id: string) => void;
  addMentorMeeting: (m: MentorMeeting) => void;
  updateMentorMeeting: (m: MentorMeeting) => void;
  deleteMentorMeeting: (id: string) => void;
  addSlackNotification: (n: OnboardingSlackNotification) => void;
};

const OnboardingContext = createContext<OnboardingContextType | null>(null);

const STORAGE_KEY = "onboarding-data-v1";

function loadFromStorage(): OnboardingData {
  if (typeof window === "undefined") return getDefaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as OnboardingData;
  } catch {}
  return getDefaultData();
}

function getDefaultData(): OnboardingData {
  return {
    members: mockMembers,
    trainingRecords: mockTrainingRecords,
    ojtRecords: mockOjtRecords,
    dailyReports: mockDailyReports,
    mentorMeetings: mockMentorMeetings,
    slackNotifications: mockSlackNotifications,
  };
}

function saveToStorage(data: OnboardingData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function isOnboardingData(value: unknown): value is OnboardingData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    Array.isArray(data.members) &&
    Array.isArray(data.trainingRecords) &&
    Array.isArray(data.ojtRecords) &&
    Array.isArray(data.dailyReports) &&
    Array.isArray(data.mentorMeetings) &&
    Array.isArray(data.slackNotifications)
  );
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  useEffect(() => {
    async function loadData() {
      const localData = loadFromStorage();

      try {
        const response = await authFetch("/api/onboarding-state");
        if (response.ok) {
          const result = await response.json();
          if (isOnboardingData(result.data)) {
            setData(result.data);
            saveToStorage(result.data);
            setHasLoadedStorage(true);
            return;
          }
        }
      } catch (error) {
        console.error("Failed to load onboarding data from Supabase", error);
      }

      setData(localData);
      setHasLoadedStorage(true);
    }

    loadData();
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage || !data) return;
    saveToStorage(data);

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await authFetch("/api/onboarding-state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(result?.error ?? "Failed to save onboarding data.");
        }
      } catch (error) {
        console.error("Failed to save onboarding data to Supabase", error);
      }
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [data, hasLoadedStorage]);

  function update(next: OnboardingData) {
    setData(next);
  }

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-slate-50 px-6">
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
          オンボーディングデータを読み込んでいます...
        </div>
      </div>
    );
  }

  const value: OnboardingContextType = {
    members: data.members,
    trainingRecords: data.trainingRecords,
    ojtRecords: data.ojtRecords,
    dailyReports: data.dailyReports,
    mentorMeetings: data.mentorMeetings,
    slackNotifications: data.slackNotifications,

    addMember: (m) => update({ ...data, members: [...data.members, m] }),
    updateMember: (m) =>
      update({ ...data, members: data.members.map((x) => (x.id === m.id ? m : x)) }),
    removeMember: (id) =>
      update({ ...data, members: data.members.filter((x) => x.id !== id) }),

    addTrainingRecord: (r) =>
      update({ ...data, trainingRecords: [...data.trainingRecords, r] }),
    updateTrainingRecord: (r) =>
      update({ ...data, trainingRecords: data.trainingRecords.map((x) => (x.id === r.id ? r : x)) }),
    deleteTrainingRecord: (id) =>
      update({ ...data, trainingRecords: data.trainingRecords.filter((x) => x.id !== id) }),
    addOjtRecord: (r) =>
      update({ ...data, ojtRecords: [...data.ojtRecords, r] }),
    updateOjtRecord: (r) =>
      update({ ...data, ojtRecords: data.ojtRecords.map((x) => (x.id === r.id ? r : x)) }),
    deleteOjtRecord: (id) =>
      update({ ...data, ojtRecords: data.ojtRecords.filter((x) => x.id !== id) }),
    addDailyReport: (r) =>
      update({ ...data, dailyReports: [...data.dailyReports, r] }),
    updateDailyReport: (r) =>
      update({ ...data, dailyReports: data.dailyReports.map((x) => (x.id === r.id ? r : x)) }),
    deleteDailyReport: (id) =>
      update({ ...data, dailyReports: data.dailyReports.filter((x) => x.id !== id) }),
    addMentorMeeting: (m) =>
      update({ ...data, mentorMeetings: [...data.mentorMeetings, m] }),
    updateMentorMeeting: (m) =>
      update({ ...data, mentorMeetings: data.mentorMeetings.map((x) => (x.id === m.id ? m : x)) }),
    deleteMentorMeeting: (id) =>
      update({ ...data, mentorMeetings: data.mentorMeetings.filter((x) => x.id !== id) }),
    addSlackNotification: (n) =>
      update({ ...data, slackNotifications: [...data.slackNotifications, n] }),
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used inside OnboardingProvider");
  return ctx;
}
