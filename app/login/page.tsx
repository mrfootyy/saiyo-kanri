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
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-6 py-10">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-semibold text-blue-600">採用管理</p>
          <h1 className="mt-2 text-2xl font-bold tracking-normal text-slate-900">{modeLabels[mode]}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{getLeadText(mode)}</p>
        </div>

        {mode !== "reset-password" && (
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => switchMode("sign-in")}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                mode === "sign-in" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              サインイン
            </button>
            <button
              type="button"
              onClick={() => switchMode("sign-up")}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                mode === "sign-up" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
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
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          )}

          {needsPassword && (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                {mode === "reset-password" ? "新しいパスワード" : "パスワード"}
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                required
                minLength={8}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          )}

          {needsConfirmPassword && (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">パスワード確認</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          )}

          {notice && (
            <p
              className={`rounded-md border px-3 py-2 text-sm ${
                notice.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {notice.message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {submitLabel}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          {mode === "sign-in" && (
            <button type="button" onClick={() => switchMode("forgot-password")} className="font-medium text-blue-600 hover:text-blue-700">
              パスワードを忘れた方
            </button>
          )}
          {(mode === "forgot-password" || mode === "reset-password") && (
            <button type="button" onClick={() => switchMode("sign-in")} className="font-medium text-blue-600 hover:text-blue-700">
              サインインへ戻る
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function LoginShell() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-6 py-10">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-semibold text-blue-600">採用管理</p>
          <h1 className="mt-2 text-2xl font-bold tracking-normal text-slate-900">ログイン</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">ログイン画面を読み込んでいます...</p>
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

  return error.message;
}
