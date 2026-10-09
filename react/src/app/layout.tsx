import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Marixa Workforce", template: "%s · Marixa Workforce" },
  description: "Chấm công và quản lý nhân sự Marixa",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
