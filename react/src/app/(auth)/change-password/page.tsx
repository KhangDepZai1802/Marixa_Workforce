"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangePasswordForm } from "@/components/change-password";

export default function ChangePasswordPage() {
  const router = useRouter();
  return <main className="login-page"><section className="login-card"><div className="login-brand"><Image src="/logo.png" width={64} height={64} alt="Logo Marixa" /><h1>Đổi mật khẩu</h1><p>Vui lòng đặt mật khẩu riêng trước khi tiếp tục.</p></div><ChangePasswordForm onSuccess={() => { router.replace("/home"); router.refresh(); }} /></section></main>;
}
