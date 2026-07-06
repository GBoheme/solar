"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost } from "@/lib/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiPost("/api/auth/login", { email, password });
      router.push(params.get("next") || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="card w-full max-w-md p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-700 text-2xl text-white">🛢️</div>
        <h1 className="text-lg font-bold">نظام تدقيق وإدارة معاملات النقل اللوجستي</h1>
        <p className="mt-1 text-xs text-slate-500">ضبط الجودة قبل إصدار الكتاب الرسمي</p>
      </div>
      {error && <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">{error}</div>}
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">البريد الإلكتروني</label>
          <input className="input" dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">كلمة المرور</label>
          <input className="input" dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "جارٍ الدخول…" : "تسجيل الدخول"}
        </button>
      </div>
      <p className="mt-6 text-center text-[11px] leading-5 text-slate-400">
        حسابات تجريبية: admin@example.com / entry@example.com / reviewer@example.com / viewer@example.com
        <br />كلمة المرور للجميع: <b dir="ltr">123456</b>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
