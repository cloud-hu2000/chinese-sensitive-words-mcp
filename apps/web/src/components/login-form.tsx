"use client";
import { FormEvent, useState } from "react";
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);
      location.href = "/";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录失败。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block text-sm font-semibold">
        邮箱
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#e3deed] px-3 py-2.5"
          placeholder="you@example.com"
        />
      </label>
      <label className="block text-sm font-semibold">
        密码
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#e3deed] px-3 py-2.5"
          placeholder="输入密码"
        />
      </label>
      {message && <p className="text-sm text-[#d54a57]">{message}</p>}
      <button
        disabled={busy}
        className="btn-primary w-full disabled:opacity-70"
      >
        {busy ? "正在登录…" : "登录"}
      </button>
    </form>
  );
}
