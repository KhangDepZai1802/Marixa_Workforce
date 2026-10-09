"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api-client";
import { Button, Field, Notice } from "@/components/ui";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmation) { setError("Mật khẩu xác nhận chưa khớp."); return; }
    setBusy(true);
    try {
      await apiRequest("/api/v1/me/change-password", { method: "POST", body: JSON.stringify({ new_password: password }) });
      setSuccess(true);
      router.replace("/today");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Không thể cập nhật mật khẩu. Hãy thử lại.");
    } finally { setBusy(false); }
  }

  return <main className="login-page"><section className="login-card">
    <div className="login-brand"><Image src="/logo.png" width={64} height={64} alt="Logo Marixa" /><h1>Đổi mật khẩu</h1><p>Vui lòng đặt mật khẩu riêng trước khi tiếp tục.</p></div>
    {success && <Notice kind="success">Đã đổi mật khẩu.</Notice>}
    {error && <Notice kind="error">{error}</Notice>}
    <form className="login-form" onSubmit={submit}>
      <Field label="Mật khẩu mới" hint="Tối thiểu 12 ký tự."><input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
      <Field label="Nhập lại mật khẩu"><input type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></Field>
      <Button type="submit" disabled={busy}>{busy ? "Đang lưu…" : "Lưu mật khẩu"}</Button>
    </form>
  </section></main>;
}
