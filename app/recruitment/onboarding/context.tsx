"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
  addTrainingRecord: (r: TrainingRecord) => void;
  addOjtRecord: (r: OjtRecord) => void;
  addDailyReport: (r: DailyReport) => void;
  addMentorMeeting: (m: MentorMeeting) => void;
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

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(getDefaultData);

  useEffect(() => {
    setData(loadFromStorage());
  }, []);

  function update(next: OnboardingData) {
    setData(next);
    saveToStorage(next);
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

    addTrainingRecord: (r) =>
      update({ ...data, trainingRecords: [...data.trainingRecords, r] }),
    addOjtRecord: (r) =>
      update({ ...data, ojtRecords: [...data.ojtRecords, r] }),
    addDailyReport: (r) =>
      update({ ...data, dailyReports: [...data.dailyReports, r] }),
    addMentorMeeting: (m) =>
      update({ ...data, mentorMeetings: [...data.mentorMeetings, m] }),
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
