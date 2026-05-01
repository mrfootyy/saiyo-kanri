"use client";

import { AuthError } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "../../lib/supabase";

type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";
type Notice = { type: "success" | "error"; message: string } | null;

const modeLabels: Record<AuthMode, string> = {
  "sign-in": "サインイン",
  "sign-up": "サインアップ",
  "forgot-password": "再設定",
  "reset-password": "新しいパスワード",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const nextPath = sanitizeNextPath(searchParams.get("next"));
  const initialMode = parseMode(searchParams.get("mode"));
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && mode === "sign-in") router.replace(nextPath);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset-password");
        setNotice({ type: "success", message: "新しいパスワードを設定してください。" });
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [mode, nextPath, router, supabase]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setNotice(null);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setLoading(true);

    if (mode === "sign-in") await signIn();
    if (mode === "sign-up") await signUp();
    if (mode === "forgot-password") await sendPasswordReset();
    if (mode === "reset-password") await updatePassword();

    setLoading(false);
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setNotice({ type: "error", message: toJapaneseError(error) });
      return;
    }
    router.replace(nextPath);
  }

  async function signUp() {
    const validationError = validatePasswordPair(password, confirmPassword);
    if (validationError) {
      setNotice({ type: "error", message: validationError });
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      setNotice({ type: "error", message: toJapaneseError(error) });
      return;
    }

    if (data.session) {
      router.replace(nextPath);
      return;
    }

    setNotice({
      type: "success",
      message: "確認メールを送信しました。メール内のリンクを開くと利用開始できます。",
    });
  }

  async function sendPasswordReset() {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login?mode=reset-password`,
    });

    if (error) {
      setNotice({ type: "error", message: toJapaneseError(error) });
      return;
    }

    setNotice({
      type: "success",
      message: "パスワード再設定メールを送信しました。メール内のリンクから新しいパスワードを設定してください。",
    });
  }

  async function updatePassword() {
    const validationError = validatePasswordPair(password, confirmPassword);
    if (validationError) {
      setNotice({ type: "error", message: validationError });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setNotice({ type: "error", message: toJapaneseError(error) });
      return;
    }

    setNotice({ type: "success", message: "パスワードを更新しました。サインインしてください。" });
    await supabase.auth.signOut();
    switchMode("sign-in");
  }

  const needsEmail = mode !== "reset-password";
  const needsPassword = mode !== "forgot-password";
  const needsConfirmPassword = mode === "sign-up" || mode === "reset-password";
  const submitLabel = getSubmitLabel(mode, loading);

  return (
    <main className="min-h-dvh bg-[#f6f8fb] text-slate-900">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.10)] lg:grid-cols-[0.95fr_1.05fr]">
          <section className="relative flex min-h-[320px] flex-col justify-between overflow-hidden bg-slate-950 px-7 py-8 text-white sm:px-10 lg:min-h-[620px]" aria-label="採用管理の概要">
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#2563eb,#14b8a6,#f59e0b)]" aria-hidden="true" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500 text-sm font-bold shadow-lg shadow-blue-950/30">
                  採
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-normal text-white">採用管理</p>
                  <p className="text-xs text-slate-400">Gadgelog Recruitment Suite</p>
                </div>
              </div>

              <div className="mt-14 max-w-md">
                <p className="text-sm font-semibold text-cyan-200">Secure workspace</p>
                <h1 className="mt-4 text-3xl font-bold leading-tight tracking-normal text-white sm:text-4xl">
                  候補者情報と選考プロセスを、安全に管理します。
                </h1>
                <p className="mt-5 text-sm leading-7 text-slate-300">
                  ログイン後、応募者管理・面接記録・Slack通知・オンボーディング状況へアクセスできます。
                </p>
              </div>
            </div>

            <div className="relative mt-10 grid gap-3 text-sm text-slate-200">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-cyan-200">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <span>ログイン済みユーザーだけがデータを操作できます。</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-amber-200">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5A2.25 2.25 0 0019.5 19.5v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </span>
                <span>パスワード再設定とメール確認に対応しています。</span>
              </div>
            </div>
          </section>

          <section className="flex items-center px-6 py-8 sm:px-10 lg:px-14" aria-label={modeLabels[mode]}>
            <div className="w-full">
              <div className="mb-8">
                <p className="text-sm font-semibold text-blue-700">Account access</p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">{modeLabels[mode]}</h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">{getLeadText(mode)}</p>
              </div>

              {mode !== "reset-password" && (
                <div className="mb-7 grid grid-cols-2 gap-1 rounded-md border border-slate-200 bg-slate-50 p-1" role="tablist" aria-label="認証方法">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "sign-in"}
                    onClick={() => switchMode("sign-in")}
                    className={`rounded px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                      mode === "sign-in" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                    }`}
                  >
                    サインイン
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "sign-up"}
                    onClick={() => switchMode("sign-up")}
                    className={`rounded px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                      mode === "sign-up" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                    }`}
                  >
                    サインアップ
                  </button>
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
          {needsEmail && (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">メールアドレス</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 sm:text-sm"
              />
            </label>
          )}

          {needsPassword && (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                {mode === "reset-password" ? "新しいパスワード" : "パスワード"}
              </span>
              <PasswordInput
                value={password}
                onChange={setPassword}
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              />
            </label>
          )}

          {needsConfirmPassword && (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">パスワード確認</span>
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((value) => !value)}
                autoComplete="new-password"
              />
            </label>
          )}

          {notice && (
            <p
              role={notice.type === "error" ? "alert" : "status"}
              className={`rounded-md border px-3 py-3 text-sm leading-6 ${
                notice.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {notice.message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {submitLabel}
          </button>
              </form>

              <div className="mt-7 flex items-center justify-center gap-4 text-sm">
                {mode === "sign-in" && (
                  <button type="button" onClick={() => switchMode("forgot-password")} className="rounded font-medium text-blue-700 underline-offset-4 hover:text-blue-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    パスワードを忘れた方
                  </button>
                )}
                {(mode === "forgot-password" || mode === "reset-password") && (
                  <button type="button" onClick={() => switchMode("sign-in")} className="rounded font-medium text-blue-700 underline-offset-4 hover:text-blue-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                    サインインへ戻る
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function PasswordInput({
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete: string;
}) {
  return (
    <div className="relative mt-2">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required
        minLength={8}
        className="w-full rounded-md border border-slate-300 bg-white py-3 pl-3 pr-12 text-base text-slate-950 shadow-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 sm:text-sm"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? "パスワードを非表示" : "パスワードを表示"}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
      >
        {visible ? (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c1.67 0 3.247-.39 4.648-1.083M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.5a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.036 12.322a1.012 1.012 0 010-.644C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.437 0 .644C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </button>
    </div>
  );
}

function LoginShell() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f6f8fb] px-6 py-10">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-[0_20px_70px_rgba(15,23,42,0.10)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white">採</div>
          <div>
            <p className="text-sm font-semibold text-slate-950">採用管理</p>
            <p className="text-xs text-slate-500">ログイン画面を読み込んでいます...</p>
          </div>
        </div>
      </div>
    </main>
  );
}

function parseMode(mode: string | null): AuthMode {
  if (mode === "sign-up" || mode === "forgot-password" || mode === "reset-password") return mode;
  return "sign-in";
}

function sanitizeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/recruitment";
  return next;
}

function validatePasswordPair(password: string, confirmPassword: string) {
  if (password.length < 8) return "パスワードは8文字以上で入力してください。";
  if (password !== confirmPassword) return "パスワード確認が一致しません。";
  return "";
}

function getLeadText(mode: AuthMode) {
  if (mode === "sign-up") return "メールアドレスとパスワードを登録して利用を開始します。";
  if (mode === "forgot-password") return "登録済みのメールアドレスに再設定リンクを送信します。";
  if (mode === "reset-password") return "新しいパスワードを入力してください。";
  return "登録済みのメールアドレスとパスワードで続行してください。";
}

function getSubmitLabel(mode: AuthMode, loading: boolean) {
  if (loading && mode === "sign-up") return "登録中...";
  if (loading && mode === "forgot-password") return "送信中...";
  if (loading && mode === "reset-password") return "更新中...";
  if (loading) return "サインイン中...";
  if (mode === "sign-up") return "サインアップ";
  if (mode === "forgot-password") return "再設定メールを送信";
  if (mode === "reset-password") return "パスワードを更新";
  return "サインイン";
}

function toJapaneseError(error: AuthError) {
  const message = error.message.toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (message.includes("user already registered")) {
    return "このメールアドレスはすでに登録されています。";
  }
  if (message.includes("password should be at least")) {
    return "パスワードは8文字以上で入力してください。";
  }
  if (message.includes("new password should be different from the old password")) {
    return "新しいパスワードは現在のパスワードとは別のものにしてください。";
  }
  if (message.includes("same password")) {
    return "新しいパスワードは現在のパスワードとは別のものにしてください。";
  }
  if (message.includes("email not confirmed")) {
    return "メールアドレスの確認が完了していません。確認メールを開いて登録を完了してください。";
  }
  if (message.includes("signup is disabled")) {
    return "現在、サインアップは利用できません。管理者にお問い合わせください。";
  }
  if (message.includes("rate limit") || message.includes("too many")) {
    return "試行回数が多すぎます。少し時間を置いてからもう一度お試しください。";
  }
  if (message.includes("session") && message.includes("missing")) {
    return "再設定用のセッションが見つかりません。再設定メールのリンクから開き直してください。";
  }

  return error.message;
}
