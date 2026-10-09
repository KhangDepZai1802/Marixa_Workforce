import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { getAuth } from "../../services/auth/auth";
import employeeApi from "../../modules/employees/api/employeeApi";
import axiosClient from "../../services/api/axiosClient";

// Chuông thông báo toàn cục:
// - Admin: nghỉ phép chờ duyệt, bàn giao chờ duyệt, báo cáo cần xử lý.
// - Employee: phép của mình chờ duyệt, báo cáo cần chỉnh sửa.
// Trạng thái "đã đọc" lưu localStorage theo user.
const READ_KEY = (userId) => `marixa_notif_read_${userId}`;
const PAGE = "pageNumber=1&pageSize=500";

// Status (camelCase từ API): leave: Pending=1; report: 0=chờ duyệt,4=đã gửi,6=cấp trên yêu cầu; handover: 0=chờ duyệt
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("vi-VN") : "");

const NotificationBell = () => {
    const auth = getAuth();
    const isAdmin = (auth?.roles || []).some((r) => /admin/i.test(String(r)));
    const [items, setItems] = useState([]);
    const [readIds, setReadIds] = useState(() => {
        try {
            const raw = localStorage.getItem(READ_KEY(auth?.userId));
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    });
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const onDown = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    const load = useCallback(async () => {
        const list = [];
        try {
            const jobs = [];

            // Nghỉ phép (trả về { items })
            jobs.push(
                employeeApi.leaveRequests().then((r) => {
                    const arr = r.data.data?.items || [];
                    arr.forEach((x) => {
                        if (x.status === 1) {
                            const me = x.employeeId === auth?.employeeId;
                            if (isAdmin || me)
                                list.push({
                                    id: `leave-${x.id}`,
                                    title: me
                                        ? "Đơn nghỉ phép của bạn đang chờ duyệt"
                                        : `Nghỉ phép của ${x.employeeName || "NV"}`,
                                    detail: `${x.leaveTypeName || "Nghỉ phép"} · ${fmtDate(x.fromDate)}${x.totalDays ? ` · ${x.totalDays} ngày` : ""}`,
                                    time: x.createdTime,
                                });
                        }
                    });
                })
            );

            // Báo cáo (trả về mảng trực tiếp)
            jobs.push(
                employeeApi.employeeReports({}).then((r) => {
                    const arr = Array.isArray(r.data.data) ? r.data.data : [];
                    arr.forEach((x) => {
                        const pending = isAdmin ? [0, 3, 4, 6].includes(x.status) : [3, 6].includes(x.status);
                        if (pending && (!isAdmin || x.employeeId === auth?.employeeId))
                            list.push({
                                id: `report-${x.id}`,
                                title: isAdmin
                                    ? `Báo cáo "${x.title || x.reportCode}" của ${x.employeeName || "NV"} cần xử lý`
                                    : `Báo cáo "${x.title || x.reportCode}" cần chỉnh sửa`,
                                detail: "Yêu cầu người quản lý đã bổ sung / thay đổi",
                                time: x.lastUpdatedTime || x.createdTime,
                            });
                    });
                })
            );

            // Bàn giao (trả về mảng trực tiếp) - chỉ admin
            if (isAdmin) {
                jobs.push(
                    axiosClient.get(`/EmployeeHandover/get-all?${PAGE}`).then((r) => {
                        const arr = Array.isArray(r.data.data) ? r.data.data : [];
                        arr.forEach((x) => {
                            if (x.status === 0)
                                list.push({
                                    id: `handover-${x.id}`,
                                    title: `Bàn giao của ${x.employeeName || "NV"} chờ duyệt`,
                                    detail: "Yêu cầu bàn giao cần xử lý",
                                    time: x.createdTime,
                                });
                        });
                    }).catch(() => {})
                );
            }

            await Promise.all(jobs);
            list.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
            setItems(list);
        } catch {
            setItems([]);
        }
    }, [isAdmin, auth?.employeeId]);

    useEffect(() => { load(); }, [load]);

    const unread = useMemo(() => items.filter((i) => !readIds.includes(i.id)), [items, readIds]);
    const markRead = (id) => {
        setReadIds((prev) => {
            const next = prev.includes(id) ? prev : [...prev, id];
            try { localStorage.setItem(READ_KEY(auth?.userId), JSON.stringify(next)); } catch { /* noop */ }
            return next;
        });
    };
    const markAllRead = () => {
        setReadIds((prev) => {
            const next = Array.from(new Set([...prev, ...items.map((i) => i.id)]));
            try { localStorage.setItem(READ_KEY(auth?.userId), JSON.stringify(next)); } catch { /* noop */ }
            return next;
        });
    };

    return (
        <div className="app-header-bell" ref={ref}>
            <button
                type="button"
                className="app-header-bell-btn"
                aria-label="Thông báo"
                onClick={() => setOpen((v) => !v)}
            >
                <span aria-hidden="true">🔔</span>
                {unread.length > 0 && (
                    <span className="app-header-bell-badge">{unread.length}</span>
                )}
            </button>

            {open && (
                <div className="app-header-bell-menu" role="menu">
                    <div className="app-header-bell-head">
                        <strong>Thông báo</strong>
                        {unread.length > 0 && (
                            <button type="button" className="app-header-bell-readall" onClick={markAllRead}>
                                Đánh dấu đọc tất cả
                            </button>
                        )}
                    </div>
                    <div className="app-header-bell-list">
                        {items.length === 0 ? (
                            <p className="app-header-bell-empty">Không có thông báo nào.</p>
                        ) : (
                            items.slice(0, 30).map((i) => {
                                const isRead = readIds.includes(i.id);
                                return (
                                    <div key={i.id} className={`app-header-bell-item${isRead ? " is-read" : ""}`}>
                                        <div className="app-header-bell-item-main">
                                            <strong>{i.title}</strong>
                                            <span>{i.detail}</span>
                                        </div>
                                        {!isRead ? (
                                            <button type="button" className="app-header-bell-item-read" title="Đánh dấu đã đọc" onClick={() => markRead(i.id)}>
                                                ✓
                                            </button>
                                        ) : (
                                            <span className="app-header-bell-item-done" title="Đã đọc">✓</span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
