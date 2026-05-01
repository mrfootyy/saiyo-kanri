import { AuthGate } from "../auth/AuthGate";
import { RecruitmentProvider } from "./context";
import Shell from "./components/Shell";

export default function RecruitmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <RecruitmentProvider>
        <Shell>{children}</Shell>
      </RecruitmentProvider>
    </AuthGate>
  );
}
