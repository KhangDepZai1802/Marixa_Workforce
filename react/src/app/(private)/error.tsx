"use client";

import { Button, Notice, Panel } from "@/components/ui";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <Panel title="Chưa tải được trang"><Notice kind="error">Kết nối có thể bị gián đoạn. Hãy thử mở lại trang.</Notice><Button type="button" onClick={retry}>Thử lại</Button></Panel>;
}
