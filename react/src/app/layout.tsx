import type { Metadata } from "next";
import "./globals.css";
import "./reference-fonts.css";
import "./reference-desktop.css";
import "./reference-adapter.css";
import "./reference-mobile.css";
import "./mobile-adapter.css";
import "./staff-mobile.css";
import "./phone-width.css";

export const metadata: Metadata = {
  title: { default: "Marixa Workforce", template: "%s · Marixa Workforce" },
  description: "Chấm công và quản lý nhân sự Marixa",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" data-mobile-design="pro"><body>{children}</body></html>;
}
