"use client";

import { useRecruitment } from "./context";
import DashboardView from "./components/DashboardView";

export default function RecruitmentPage() {
  const { candidates, slackNotifications, emailHistories, interviewStages } = useRecruitment();
  return (
    <DashboardView
      candidates={candidates}
      slackNotifications={slackNotifications}
      emailHistories={emailHistories}
      interviewStages={interviewStages}
    />
  );
}
