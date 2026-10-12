"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangePasswordForm } from "@/components/change-password";

export default function ChangePasswordPage() {
  const router = useRouter();
  return <main className="login-page"><section className="login-card"><div className="login-brand"><Image src="/logo.png" width={48} height={48} alt="Logo Marixa" /><span>Marixa</span></div><h1>Đổi mật khẩu</h1><p className="login-description">Vui lòng đặt mật khẩu riêng trước khi tiếp tục.</p><ChangePasswordForm onSuccess={() => { router.replace("/home"); router.refresh(); }} /></section></main>;
}
