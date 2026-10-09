import type { Metadata } from "next";

export const metadata: Metadata = { title: "Marixa Chấm Công", description: "Hệ thống chấm công văn phòng Marixa" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
