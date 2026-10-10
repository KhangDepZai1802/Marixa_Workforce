"use client";

import { useEffect, useState } from "react";

export function VnClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const first = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, []);
  const parts = now ? new Intl.DateTimeFormat("en", { timeZone: "Asia/Ho_Chi_Minh", hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).formatToParts(now) : [];
  const hour = Number(parts.find(part => part.type === "hour")?.value ?? 0), minute = Number(parts.find(part => part.type === "minute")?.value ?? 0);
  return <div className="admhome-clock-card"><div className="admhome-clock" aria-label="Đồng hồ giờ Việt Nam"><div className="admhome-clock-face" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <span key={index} className="admhome-clock-tick" style={{ transform: `rotate(${index * 30}deg) translateY(-34px)` }} />)}<div className="admhome-clock-hand admhome-clock-hand--hour" style={{ transform: `rotate(${((hour % 12) + minute / 60) * 30}deg)` }} /><div className="admhome-clock-hand admhome-clock-hand--minute" style={{ transform: `rotate(${minute * 6}deg)` }} /><div className="admhome-clock-pin" /></div><div className="admhome-clock-meta"><strong>{now ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now) : "—"}</strong><span>{now ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(now) : ""}</span><span className="admhome-clock-tz">Giờ Việt Nam · GMT+7</span></div></div></div>;
}
