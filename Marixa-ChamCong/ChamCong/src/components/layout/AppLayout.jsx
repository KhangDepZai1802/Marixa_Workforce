import { useCallback, useEffect, useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { usePillNavActiveInView } from "./usePillNav";
import "./header.css";

const COLLAPSE_KEY = "marixa_sidebar_collapsed";

// Layout dÃ¹ng chung má»i trang Ä‘Ã£ Ä‘Äƒng nháº­p:
// header nav (100% width) trÃªn cÃ¹ng, bÃªn dÆ°á»›i lÃ  sidebar (kÃ©o ra/vÃ o) + main.
const AppLayout = ({ title, subtitle, profile, children }) => {
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

    // KÃ©o ra/vÃ o báº±ng phÃ­m táº¯t "[" (khÃ´ng cáº§n focus input).
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "[") toggle();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [toggle]);

    return (
        <div className="app-shell">
            <Header
                profile={profile}
                collapsed={collapsed}
                onToggleSidebar={toggle}
            />
            <div className="app-body">
                <Sidebar collapsed={collapsed} />
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

export default AppLayout;
