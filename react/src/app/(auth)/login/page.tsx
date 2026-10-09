"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api-client";
import { Button, Field, Notice } from "@/components/ui";

type LoginResult = { data: { role: "employee" | "hr" | "admin"; must_change_password: boolean } };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<LoginResult>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      router.replace(result.data.must_change_password ? "/change-password" : "/today");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="login-page">
    <section className="login-card" aria-labelledby="login-title">
      <div className="login-brand"><Image src="/logo.png" width={78} height={78} alt="Logo Marixa" priority /><h1 id="login-title">Đăng nhập Marixa</h1><p>Hệ thống chấm công và nhân sự</p></div>
      {error && <Notice kind="error">{error}</Notice>}
      <form className="login-form" onSubmit={submit}>
        <Field label="Email công việc"><input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <Field label="Mật khẩu"><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        <Button type="submit" className="button-large" disabled={busy}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</Button>
      </form>
      <p className="login-footnote">Chưa có tài khoản hoặc cần đặt lại mật khẩu? Vui lòng liên hệ quản trị viên.</p>
    </section>
  </main>;
}
