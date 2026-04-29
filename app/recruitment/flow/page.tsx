"use client";

import { useRecruitment } from "../context";
import InterviewFlowView from "../components/InterviewFlowView";

export default function FlowPage() {
  const { interviewStages, setInterviewStages } = useRecruitment();
  return <InterviewFlowView stages={interviewStages} onUpdate={setInterviewStages} />;
}
