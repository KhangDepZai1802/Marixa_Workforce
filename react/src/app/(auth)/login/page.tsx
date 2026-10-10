"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api-client";
import { Button, Field, Notice } from "@/components/ui";

type LoginResult = { data: { role: "employee" | "hr" | "admin"; must_change_password: boolean } };

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(searchParams.get("expired") === "1"
    ? "Phiên đăng nhập không còn hiệu lực hoặc tài khoản đã bị khóa. Vui lòng đăng nhập lại."
    : "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<LoginResult>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ phone, password }) });
      router.replace(result.data.must_change_password ? "/change-password" : "/home");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="login-page reference-login-page">
    <section className="reference-login-brand"><div className="reference-login-brand-logo"><Image src="/logo.png" width={44} height={44} alt="MARIXA" priority /><span>MARIXA</span></div><h2>Hệ thống chấm công &amp; quản lý nhân sự</h2><p>Quản lý chấm công, nghỉ phép và nhân sự của doanh nghiệp trên một nền tảng duy nhất.</p><div className="reference-login-brand-badge"><span className="badge-dot" />Attendance Module</div></section>
    <div className="reference-login-content"><section className="login-card reference-login-card" aria-labelledby="login-title">
      <h1 id="login-title">Đăng nhập</h1><p className="reference-login-subtitle">Vui lòng nhập thông tin tài khoản để tiếp tục</p>
      {error && <Notice kind="error">{error}</Notice>}
      <form className="login-form reference-login-form" onSubmit={submit}>
        <Field label="Số điện thoại"><input type="tel" name="phone" autoComplete="tel" placeholder="Nhập số điện thoại" inputMode="tel" required value={phone} onChange={event => setPhone(event.target.value)} /></Field>
        <Field label="Mật khẩu"><span className="password-wrapper"><input type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Nhập mật khẩu" required value={password} onChange={event => setPassword(event.target.value)} /><button type="button" className="password-toggle" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword} onClick={() => setShowPassword(show => !show)}>{showPassword ? "Ẩn" : "Hiện"}</button></span></Field>
        <Button type="submit" className="reference-login-btn" disabled={busy}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</Button>
      </form><p className="login-footnote">Chưa có tài khoản hoặc cần đặt lại mật khẩu? Vui lòng liên hệ quản trị viên.</p>
    </section></div>
  </main>;
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
