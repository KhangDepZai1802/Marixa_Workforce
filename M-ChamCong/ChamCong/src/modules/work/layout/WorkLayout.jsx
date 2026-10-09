import { useCallback, useEffect, useState } from "react";
import Header from "../../../components/layout/Header";
import WorkSidebar from "./WorkSidebar";
import { usePillNavActiveInView } from "../../../components/layout/usePillNav";
import "../../../components/layout/header.css";
import "../../me/attendance.css";
import "../../employees/employee.css";
import "../../admin/admin.css";
import "../work.css";

const COLLAPSE_KEY = "marixa_work_sidebar_collapsed";

// Layout khu "CÃ´ng viá»‡c": header + sidebar (Tá»•ng quan / Viá»‡c cá»§a tÃ´i / BÃ¡o cÃ¡o + tÃ¬m kiáº¿m).
// "search" do cha sá»Ÿ há»¯u (controlled) Ä‘á»ƒ thanh tÃ¬m kiáº¿m lá»c chung cáº£ 3 view.
const WorkLayout = ({ title, subtitle, search, onSearchChange, children }) => {
    usePillNavActiveInView();
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; }
    });

    const toggle = useCallback(() => {
        setCollapsed((v) => {
            const next = !v;
            try { localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); } catch { /* noop */ }
            return next;
        });
    }, []);

    useEffect(() => {
        const onKey = (e) => { if (e.key === "[") toggle(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [toggle]);

    return (
        <div className="app-shell">
            <Header collapsed={collapsed} onToggleSidebar={toggle} />
            <div className="app-body">
                <WorkSidebar collapsed={collapsed} search={search} setSearch={onSearchChange} />
                <main className="att-main">
                    {title && (
                        <div className="att-main-head">
                            <h1>{title}</h1>
                            {subtitle && <p>{subtitle}</p>}
                        </div>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
};

export default WorkLayout;
