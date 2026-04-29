import { RecruitmentProvider } from "./context";
import Sidebar from "./components/Sidebar";

export default function RecruitmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RecruitmentProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </RecruitmentProvider>
  );
}
