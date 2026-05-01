import { RecruitmentProvider } from "./context";
import Sidebar from "./components/Sidebar";

export default function RecruitmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RecruitmentProvider>
      <div className="flex h-dvh overflow-hidden bg-slate-50">
        <Sidebar />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-slate-50">{children}</main>
      </div>
    </RecruitmentProvider>
  );
}
