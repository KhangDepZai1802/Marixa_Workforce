"use client";

import { createContext, useContext, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, apiRequest } from "@/lib/api-client";
import { Button, Field, Notice } from "@/components/ui";
import { Dialog } from "@/components/dialog";

const PasswordContext = createContext<(() => void) | null>(null);
export function PasswordDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return <PasswordContext.Provider value={() => setOpen(true)}>{children}{open && <Dialog title="Đổi mật khẩu" busy={busy} onClose={() => setOpen(false)}><ChangePasswordForm onBusyChange={setBusy} /></Dialog>}</PasswordContext.Provider>;
}
export function ChangePasswordButton({ children = "Đổi mật khẩu", className, onClick }: { children?: ReactNode; className?: string; onClick?: () => void }) {
  const open = useContext(PasswordContext);
  return <button type="button" className={className} onClick={() => { onClick?.(); open?.(); }}>{children}</button>;
}
export function ChangePasswordForm({ onSuccess, onBusyChange }: { onSuccess?: () => void; onBusyChange?: (busy: boolean) => void }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(""); setSuccess(false);
    if (password !== confirmation) { setError("Mật khẩu xác nhận chưa khớp."); return; }
    setBusy(true); onBusyChange?.(true);
    try {
      await apiRequest("/api/v1/me/change-password", { method: "POST", body: JSON.stringify({ new_password: password }) });
      setSuccess(true);
      setPassword(""); setConfirmation("");
      onSuccess?.();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Không thể cập nhật mật khẩu. Hãy thử lại.");
    } finally { setBusy(false); onBusyChange?.(false); }
  }

  return <>
    {success && <Notice kind="success">Đã đổi mật khẩu.</Notice>}
    {error && <Notice kind="error">{error}</Notice>}
    <form className="login-form" onSubmit={submit}>
      <Field label="Mật khẩu mới" hint="Tối thiểu 12 ký tự."><input disabled={busy} type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
      <Field label="Nhập lại mật khẩu"><input disabled={busy} type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></Field>
      <Button type="submit" disabled={busy}>{busy ? "Đang lưu…" : "Lưu mật khẩu"}</Button>
    </form>
  </>;
}
