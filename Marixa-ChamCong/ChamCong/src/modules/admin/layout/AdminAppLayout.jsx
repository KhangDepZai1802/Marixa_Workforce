import { useCallback, useEffect, useState } from "react";
import Header from "../../../components/layout/Header";
import AdminSidebar from "./AdminSidebar";
import "../../../components/layout/header.css";
import "../admin.css";
import { usePillNavActiveInView } from "../../../components/layout/usePillNav";

const COLLAPSE_KEY = "marixa_sidebar_collapsed";

// Layout Ä‘á»™c láº­p cho khu quáº£n trá»‹: header + sidebar Dashboard + ná»™i dung trang.
const AdminAppLayout = ({ title, subtitle, children }) => {
    usePillNavActiveInView();
    const [collapsed, setCollapsed] = useState(() => {
        try {
            return localStorage.getItem(COLLAPSE_KEY) === "1";
        } catch {
            return false;
        }
    });

    const toggle = useCallback(() => {
        setCollapsed((v) => {
            const next = !v;
            try {
                localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
            } catch {
                // localStorage bá»‹ cháº·n: bá» qua, khÃ´ng cháº·n luá»“ng.
            }
            return next;
        });
    }, []);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "[") toggle();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [toggle]);

    return (
        <div className="app-shell">
            <Header collapsed={collapsed} onToggleSidebar={toggle} />
            <div className="app-body">
                <AdminSidebar collapsed={collapsed} />
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

export default AdminAppLayout;
