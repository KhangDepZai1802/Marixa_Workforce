import type { Metadata, Viewport } from "next";
import "./reference-fonts.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Marixa · Chấm công & nhân sự", template: "%s · Marixa" },
  description: "Chấm công và quản lý nhân sự Marixa",
  icons: {
    icon: { url: "/logo.png", type: "image/png" },
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#1647c8" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
