"use client";

import { FormEvent, useState } from "react";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName: name }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error);
      window.location.href = "/";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "注册失败。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-semibold">
        称呼
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          className="mt-1.5 w-full rounded-xl border border-[#e3deed] px-3 py-2.5 outline-none focus:border-violet-400"
          placeholder="例如：小陈"
        />
      </label>
      <label className="block text-sm font-semibold">
        邮箱
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#e3deed] px-3 py-2.5 outline-none focus:border-violet-400"
          placeholder="you@example.com"
        />
      </label>
      <label className="block text-sm font-semibold">
        密码
        <input
          type="password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#e3deed] px-3 py-2.5 outline-none focus:border-violet-400"
          placeholder="至少 8 位"
        />
      </label>
      {message && <p className="text-sm text-[#d54a57]">{message}</p>}
      <button
        disabled={busy}
        className="btn-primary w-full disabled:opacity-70"
      >
        {busy ? "正在创建…" : "创建免费账户"}
      </button>
    </form>
  );
}
