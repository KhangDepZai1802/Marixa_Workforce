import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage, translate } from "../../services/i18n/LanguageProvider";
import WorkLayout from "./layout/WorkLayout";
import adminApi from "../admin/api/adminApi";
import { getAuth } from "../../services/auth/auth";
import "./work.css";

const PRIORITY = ["Thấp", "Trung bình", "Cao", "Khẩn"];
const PRIORITY_TONE = ["muted", "info", "warn", "bad"];
const PROJECT_COLORS = [
    "#2f6df6", "#16a085", "#e67e22", "#8e44ad", "#c0392b",
    "#1565c0", "#00838f", "#d81b60", "#5e35b1", "#2e7d32",
    "#f57c00", "#37474f",
];
const STATUS_META = [
    { id: 0, label: "Chưa bắt đầu" },
    { id: 1, label: "Đang thực hiện" },
    { id: 2, label: "Hoàn thành" },
    { id: 3, label: "Bị chặn" },
];

const pad = (n) => String(n).padStart(2, "0");
const localDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => localDateStr(new Date());
const shiftDayISO = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return localDateStr(d); };
const dueStr = (v) => (v ? localDateStr(new Date(v)) : "");
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("vi-VN", { dateStyle: "medium" }) : "—");
const startOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    const mon = new Date(d); mon.setDate(d.getDate() + diff); mon.setHours(0, 0, 0, 0);
    return mon;
};
const avg = (p) => Math.round((p.quality + p.timeliness + p.collaboration + p.initiation) / 4);

const WorkPage = () => {
    const { language } = useLanguage();
    const L = (t) => translate(t, language);
    const navigate = useNavigate();
    const { search } = useLocation();
    const tab = useMemo(() => new URLSearchParams(search).get("tab") || "overview", [search]);
    const auth = getAuth();
    const roles = auth?.roles || [];
    const canManage = roles.some((r) => /admin|manager|hr/i.test(String(r)));
    const isFullScope = roles.some((r) => /admin|hr/i.test(String(r)));

    const [q, setQ] = useState("");
    const [tasks, setTasks] = useState([]);
    const [assigned, setAssigned] = useState([]);
    const [projects, setProjects] = useState([]);
    const [subordinates, setSubordinates] = useState([]);
    const [perfs, setPerfs] = useState([]);
    const [dataReady, setDataReady] = useState(false);
    const [repFilter, setRepFilter] = useState(-1);

    const [openTask, setOpenTask] = useState(null);
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState("");
    const [dragId, setDragId] = useState(null);
    const [overCol, setOverCol] = useState(null);

    const [showProject, setShowProject] = useState(false);
    const [projectForm, setProjectForm] = useState({
        name: "", description: "", startDate: todayISO(), endDate: shiftDayISO(7),
        memberIds: [], file: null, color: PROJECT_COLORS[0],
    });
    const fileRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState("");
    const [error, setError] = useState("");

    const [showPerf, setShowPerf] = useState(false);
    const [perfForm, setPerfForm] = useState({
        employeeId: "", period: new Date().toISOString().slice(0, 7),
        quality: 3, timeliness: 3, collaboration: 3, initiation: 3,
        strengths: "", improvements: "", overallComment: "",
    });

    const notify = (m) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

    const loadAll = useCallback(async () => {
        try {
            const r = await adminApi.myWorkTasks();
            setTasks(r.data.data || []);
            const p = await (canManage ? adminApi.allWorkPerformance() : adminApi.myWorkPerformance());
            setPerfs(p.data.data || []);
            if (canManage) {
                const [a, pr, sub, asg] = await Promise.all([
                    adminApi.assignableEmployees(),
                    adminApi.workProjects(),
                    adminApi.selectableEmployees(),
                    adminApi.assignedWorkTasks(),
                ]);
                setSubordinates(sub.data.data || []);
                setProjects(pr.data.data || []);
                setAssigned(asg.data.data || []);
            }
        } finally { setDataReady(true); }
    }, [canManage]);
    useEffect(() => { loadAll(); }, [loadAll]);

    const loadComments = async (task) => {
        try { const r = await adminApi.workTaskComments(task.id); setComments(r.data.data || []); }
        catch { setComments([]); }
    };
    const openTaskDetail = (task) => { setOpenTask(task); setCommentText(""); setComments([]); loadComments(task); };

    const filteredTasks = useMemo(
        () => tasks.filter((t) => !q || `${t.title} ${t.assigneeName} ${t.assignedByName}`.toLowerCase().includes(q)),
        [tasks, q]
    );
    const tasksByStatus = (status) =>
        filteredTasks.filter((t) => t.status === status)
            .sort((a, b) => b.priority - a.priority || new Date(a.dueDate) - new Date(b.dueDate));

    const onDragStart = (e, id) => { setDragId(id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(id)); };
    const onDropTo = async (status) => {
        setOverCol(null);
        if (!dragId) return;
        const task = tasks.find((t) => t.id === dragId);
        setDragId(null);
        if (!task || task.status === status) return;
        const progress = status === 2 ? 100 : status === 1 ? Math.max(task.progressPercent, 50) : 0;
        try { await adminApi.moveWorkTask(dragId, { status, progressPercent: progress }); loadAll(); }
        catch (err) { setError(err.response?.data?.message || "Không thể cập nhật trạng thái."); }
    };

    const submitComment = async () => {
        if (!commentText.trim()) return;
        try {
            await adminApi.addWorkTaskComment(openTask.id, { content: commentText });
            setCommentText("");
            const r = await adminApi.workTaskComments(openTask.id);
            setComments(r.data.data || []);
        } catch (err) { setError(err.response?.data?.message || "Không gửi được bình luận."); }
    };

    const openProject = () => {
        setProjectForm({ name: "", description: "", startDate: todayISO(), endDate: shiftDayISO(7), memberIds: [], file: null, color: PROJECT_COLORS[0] });
        setShowProject(true);
    };

    // Chỉ cho phép giao việc cho CẤP DƯỚI (backend đã filter, frontend cũng filter)
    const assignable = useMemo(
        () => subordinates.filter((s) => s.level === "subordinate"),
        [subordinates]
    );

    const toggleMember = (id) => {
        setProjectForm((f) => ({
            ...f,
            memberIds: f.memberIds.includes(id) ? f.memberIds.filter((x) => x !== id) : [...f.memberIds, id],
        }));
    };

    const submitProject = async () => {
        if (!projectForm.name.trim()) { notify(L("Vui lòng nhập tên dự án.")); return; }
        if (!projectForm.memberIds.length) { notify(L("Vui lòng chọn ít nhất 1 người nhận (cấp dưới).")); return; }
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append("name", projectForm.name);
            fd.append("description", projectForm.description || "");
            fd.append("startDate", projectForm.startDate);
            fd.append("endDate", projectForm.endDate);
            fd.append("color", projectForm.color || "");
            projectForm.memberIds.forEach((id) => fd.append("memberIds", id));
            if (projectForm.file) fd.append("file", projectForm.file);
            await adminApi.createWorkProject(fd);
            setShowProject(false);
            notify(L("Đã tạo dự án & giao việc."));
            loadAll();
        } catch (err) {
            setError(err.response?.data?.message || "Không tạo được dự án.");
        } finally { setBusy(false); }
    };

    const openNewPerf = () => { setPerfForm((f) => ({ ...f, employeeId: subordinates[0]?.id || "" })); setShowPerf(true); };
    const submitPerf = async () => {
        if (!canManage || !perfForm.employeeId) { notify(L("Chọn nhân viên để đánh giá.")); return; }
        setBusy(true);
        try {
            await adminApi.createWorkPerformance({
                ...perfForm,
                periodLabel: `Kỳ ${new Date(perfForm.period + "-01").toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" })}`,
                submit: true,
            });
            setShowPerf(false); notify(L("Đã gửi đánh giá hiệu suất.")); loadAll();
        } catch (err) { setError(err.response?.data?.message || "Không đánh giá được."); }
        finally { setBusy(false); }
    };
    const confirmPerf = async (p) => {
        setBusy(true);
        try { await adminApi.confirmWorkPerformance(p.id, { confirm: true }); notify(L("Đã xác nhận đánh giá.")); loadAll(); }
        catch (err) { setError(err.response?.data?.message || "Không xác nhận được."); }
        finally { setBusy(false); }
    };

    const T = todayISO();
    const T3 = shiftDayISO(3);
    const openTasks = tasks.filter((t) => t.status !== 2);
    const counts = useMemo(() => ({
        overdue: openTasks.filter((t) => dueStr(t.dueDate) < T).length,
        dueToday: openTasks.filter((t) => dueStr(t.dueDate) === T).length,
        dueSoon: openTasks.filter((t) => dueStr(t.dueDate) > T && dueStr(t.dueDate) <= T3).length,
        awaitingReview: canManage ? assigned.filter((t) => t.status === 1).length : 0,
        needAssign: canManage ? projects.filter((p) => p.status !== 1 && p.memberCount === 0).length : 0,
    }), [tasks, assigned, projects, canManage, T, T3]);

    const week = useMemo(() => {
        const s = startOfWeek();
        const e = new Date(s); e.setDate(s.getDate() + 6);
        const sIso = localDateStr(s), eIso = localDateStr(e);
        return tasks
            .filter((t) => { const d = dueStr(t.dueDate); return d >= sIso && d <= eIso; })
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }, [tasks]);

    const todayTasks = useMemo(() => openTasks
        .filter((t) => dueStr(t.dueDate) <= T)
        .sort((a, b) => b.priority - a.priority || dueStr(a.dueDate).localeCompare(dueStr(b.dueDate))), [openTasks, T]);

    const completion = tasks.length ? Math.round(tasks.filter((t) => t.status === 2).length / tasks.length * 100) : 0;
    const kpi = { open: openTasks.length, doing: tasks.filter((t) => t.status === 1).length, done: tasks.filter((t) => t.status === 2).length, perf: perfs.length ? avg(perfs[perfs.length - 1]) : 0 };
    const myPerfs = canManage ? perfs.filter((p) => p.status !== 0) : perfs;
    const total = tasks.length;
    const done = kpi.done, doing = kpi.doing, blocked = tasks.filter((t) => t.status === 3).length;

    const repTasks = useMemo(() => {
        const list = repFilter === -1 ? tasks : tasks.filter((t) => t.status === repFilter);
        return [...list].sort((a, b) => (a.status - b.status) || (b.priority - a.priority) || (new Date(a.dueDate) - new Date(b.dueDate)));
    }, [tasks, repFilter]);

    const PriorityTag = ({ p }) => <i className={`work-prio work-prio--${PRIORITY_TONE[p]}`}>{L(PRIORITY[p])}</i>;
    const TaskBadge = ({ status }) => {
        const tone = status === 2 ? "ok" : status === 1 ? "info" : status === 3 ? "bad" : "muted";
        return <i className={`work-status work-status--${tone}`}>{STATUS_META.find((s) => s.id === status)?.label || status}</i>;
    };
    const Stars = ({ value, onChange, readOnly = false }) => (
        <span className="work-stars">
            {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" disabled={readOnly} className={n <= value ? "on" : ""}
                    onClick={() => onChange?.(n)} aria-label={`${n} sao`}>★</button>
            ))}
        </span>
    );
    const TaskCard = ({ t, draggable }) => (
        <article
            className={`work-card${dragId === t.id ? " dragging" : ""}`}
            draggable={draggable}
            onDragStart={(e) => onDragStart(e, t.id)}
            onDragEnd={() => setDragId(null)}
            onClick={() => openTaskDetail(t)}
            role="button"
        >
            <div className="work-card-top">
                <PriorityTag p={t.priority} />
                <span className={`work-card-due${dueStr(t.dueDate) < T && t.status !== 2 ? " overdue" : ""}`}>{L("Hạn")} {fmtDate(t.dueDate)}</span>
            </div>
            <strong>{t.title}</strong>
            {t.description && <p className="work-card-desc">{t.description}</p>}
            <div className="work-card-foot">
                <span className="work-card-assignee">→ {t.assignedByName || t.assigneeName}</span>
                <span className="work-card-meta">💬 {t.commentCount || 0}</span>
            </div>
            {t.status === 1 && <div className="work-card-progress"><div style={{ width: `${t.progressPercent}%` }} /></div>}
        </article>
    );

    return (
        <WorkLayout
            title="Công việc"
            subtitle="Tổng quan · Việc của tôi · Tiến độ · Dự án · Hiệu suất"
            search={q}
            onSearchChange={setQ}
        >
            <div className="work-shell">
                {msg && <div className="att-notice att-notice--ok">{msg}</div>}
                {error && <div className="att-error">{error}<button onClick={() => setError("")}>×</button></div>}

                {!dataReady ? <div className="att-loading">{L("Đang tải...")}</div> : (
                    <>
                        {/* ============ TỔNG QUAN ============ */}
                        {tab === "overview" && (
                            <div className="work-overview">
                                <div className="work-ov-hero">
                                    <div className="work-ov-hi">
                                        <p className="work-ov-date">{new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                                        <h2>{L("Xin chào")}, {auth?.userName || auth?.employeeCode || "..."}</h2>
                                        <p className="work-ov-sub">{L("Đây là tiến độ công việc của bạn. Tạo dự án, giao việc và theo dõi tình trạng từ bảng bên dưới.")}</p>
                                    </div>
                                    <div className="work-ov-ring" style={{ background: `conic-gradient(#2f6df6 ${completion * 3.6}deg, rgba(255,255,255,.15) 0deg)` }}>
                                        <div className="work-ov-ring-inner"><strong>{completion}%</strong><span>{L("Hoàn thành")}</span></div>
                                    </div>
                                </div>

                                <section className="att-card">
                                    <div className="work-ov-head"><h3>{L("Công việc hôm nay")}</h3></div>
                                    <div className="work-today-counts">
                                        <div className="work-ov-count work-ov-count--bad"><strong>{counts.overdue}</strong><span>{L("Quá hạn")}</span></div>
                                        <div className="work-ov-count work-ov-count--info"><strong>{counts.dueToday}</strong><span>{L("Đến hạn hôm nay")}</span></div>
                                        <div className="work-ov-count work-ov-count--warn"><strong>{counts.dueSoon}</strong><span>{L("Sắp đến hạn (3 ngày)")}</span></div>
                                        <div className="work-ov-count work-ov-count--blue"><strong>{counts.awaitingReview}</strong><span>{L("Chờ tôi duyệt")}</span></div>
                                        <div className="work-ov-count work-ov-count--muted"><strong>{counts.needAssign}</strong><span>{L("Công việc cần giao")}</span></div>
                                    </div>
                                </section>

                                <section className="att-card">
                                    <div className="work-ov-head">
                                        <h3>{L("Việc của tôi tuần này")}</h3>
                                        <button type="button" className="work-quick-link" onClick={() => navigate("/work?tab=tasks")}>{L("Bảng công việc")} →</button>
                                    </div>
                                    {week.length === 0
                                        ? <p className="att-muted">{L("Tuần này không có nhiệm vụ nào.")}</p>
                                        : <div className="work-week-list">
                                            {week.map((t) => (
                                                <div key={t.id} className="work-ov-item" onClick={() => openTaskDetail(t)} role="button">
                                                    <span className="work-ov-ico report">▤</span>
                                                    <div className="work-ov-text">
                                                        <strong>{t.title}</strong>
                                                        <small>{L("Hạn")}: {fmtDate(t.dueDate)} · {L("Do")}: {t.assignedByName}</small>
                                                    </div>
                                                    <div className="work-ov-item-right">
                                                        <PriorityTag p={t.priority} />
                                                        <TaskBadge status={t.status} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>}
                                </section>

                                <section className="att-card">
                                    <div className="work-ov-head">
                                        <h3>{L("Danh sách công việc hôm nay")}</h3>
                                        {canManage && <button type="button" className="work-add-btn work-add-btn--sm" onClick={openProject}>+ {L("Thêm dự án")}</button>}
                                    </div>
                                    {todayTasks.length === 0
                                        ? <p className="att-muted">{L("Hôm nay không có nhiệm vụ quá hạn hay đến hạn.")}</p>
                                        : <div className="work-today-kanban">
                                            {STATUS_META.map((col) => {
                                                const items = todayTasks.filter((t) => t.status === col.id);
                                                return (
                                                    <div key={col.id} className="work-tk-col">
                                                        <div className="work-tk-head">
                                                            <span>{L(col.label)}</span>
                                                            <i className="work-tk-count">{items.length}</i>
                                                        </div>
                                                        <div className="work-tk-body">
                                                            {items.length === 0
                                                                ? <p className="att-muted work-col-empty">{L("Kéo thẻ vào đây")}</p>
                                                                : items.map((t) => <TaskCard key={t.id} t={t} draggable={false} />)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>}
                                </section>
                            </div>
                        )}

                        {/* ============ VIỆC CỦA TÔI (Kanban) ============ */}
                        {tab === "tasks" && (
                            <div className="work-kanban-page">
                                <div className="work-kanban-head">
                                    <span className="att-muted">{filteredTasks.length} {L("nhiệm vụ")} · {L("Kéo thả thẻ để đổi trạng thái")}</span>
                                    {canManage && <button type="button" className="work-add-btn" onClick={openProject}>+ {L("Thêm dự án & giao việc")}</button>}
                                </div>
                                <div className="work-kanban">
                                    {STATUS_META.map((col) => {
                                        const items = tasksByStatus(col.id);
                                        return (
                                            <section key={col.id}
                                                className={`work-col${overCol === col.id ? " drop-target" : ""}`}
                                                onDragOver={(e) => { e.preventDefault(); setOverCol(col.id); }}
                                                onDragLeave={() => setOverCol((v) => (v === col.id ? null : v))}
                                                onDrop={() => onDropTo(col.id)}
                                            >
                                                <header className="work-col-head">
                                                    <span>{L(col.label)}</span>
                                                    <i className="work-col-count">{items.length}</i>
                                                </header>
                                                <div className="work-col-body">
                                                    {items.length === 0 && <p className="att-muted work-col-empty">{L("Kéo thẻ vào đây")}</p>}
                                                    {items.map((t) => <TaskCard key={t.id} t={t} draggable />)}
                                                </div>
                                            </section>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ============ TIẾN ĐỘ ============ */}
                        {tab === "reports" && (
                            <div className="work-progress-report">
                                <div className="work-pr-note">
                                    <strong>{L("Tiến độ công việc")}</strong>
                                    <p>{L("Tổng hợp tiến độ các nhiệm vụ được giao. Đây là báo cáo riêng về tiến độ làm việc, không liên quan đến báo cáo chuyên môn / báo cáo kỳ.")}</p>
                                </div>
                                <div className="work-pr-summary">
                                    <div className="work-pr-stat"><span>{L("Tổng nhiệm vụ")}</span><strong>{total}</strong></div>
                                    <div className="work-pr-stat doing"><span>{L("Đang làm")}</span><strong>{doing}</strong></div>
                                    <div className="work-pr-stat done"><span>{L("Hoàn thành")}</span><strong>{done}</strong></div>
                                    <div className="work-pr-stat blocked"><span>{L("Bị chặn")}</span><strong>{blocked}</strong></div>
                                </div>
                                <div className="work-pr-bar">
                                    <div className="work-pr-bar-head"><span>{L("Tỉ lệ hoàn thành")}</span><em>{completion}%</em></div>
                                    <div className="work-pr-bar-track"><div style={{ width: `${completion}%` }} /></div>
                                </div>
                                <div className="work-pr-filters">
                                    <button type="button" className={repFilter === -1 ? "on" : ""} onClick={() => setRepFilter(-1)}>{L("Tất cả")}</button>
                                    {STATUS_META.map((s) => (
                                        <button key={s.id} type="button" className={repFilter === s.id ? "on" : ""} onClick={() => setRepFilter(s.id)}>
                                            {L(s.label)} ({tasks.filter((t) => t.status === s.id).length})
                                        </button>
                                    ))}
                                </div>
                                <div className="work-pr-table-wrap">
                                    {repTasks.length === 0 ? <p className="att-muted">{L("Không có nhiệm vụ nào phù hợp.")}</p> : (
                                        <table className="work-pr-table">
                                            <thead><tr>
                                                <th>{L("Tiêu đề")}</th><th>{L("Người thực hiện")}</th><th>{L("Ưu tiên")}</th><th>{L("Trạng thái")}</th>
                                                <th className="w-progress">{L("Tiến độ")}</th><th>{L("Hạn")}</th>
                                            </tr></thead>
                                            <tbody>
                                                {repTasks.map((t) => (
                                                    <tr key={t.id} onClick={() => openTaskDetail(t)} role="button">
                                                        <td><strong>{t.title}</strong></td>
                                                        <td>{t.assigneeName}</td>
                                                        <td><PriorityTag p={t.priority} /></td>
                                                        <td><TaskBadge status={t.status} /></td>
                                                        <td className="w-progress">
                                                            <div className="work-pr-mini"><div style={{ width: `${t.status === 2 ? 100 : t.progressPercent}%` }} /></div>
                                                            <em>{t.status === 2 ? 100 : t.progressPercent}%</em>
                                                        </td>
                                                        <td>{fmtDate(t.dueDate)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ============ DỰ ÁN ============ */}
                        {tab === "projects" && (
                            <div className="work-perf-page">
                                <div className="work-kanban-head">
                                    <span className="att-muted">{L("Các dự án / gói công việc của bạn")}</span>
                                    {canManage && <button type="button" className="work-add-btn" onClick={openProject}>+ {L("Thêm dự án")}</button>}
                                </div>
                                {projects.length === 0
                                    ? <div className="att-card"><p className="att-muted">{L("Chưa có dự án nào.")}</p></div>
                                    : <div className="work-project-list">
                                        {projects.map((p) => (
                                            <article key={p.id} className="work-project-card" style={{ borderTop: `5px solid ${p.color || "#2f6df6"}` }}>
                                                <div className="work-project-card-head" style={{ background: p.color ? `${p.color}18` : "#f6f9fc" }}>
                                                    <div className="work-project-card-icon" style={{ background: p.color || "#2f6df6" }}>◈</div>
                                                    <div className="work-project-card-title">
                                                        <strong>{p.name}</strong>
                                                        <small>{L("Từ")}: {fmtDate(p.startDate)} · {L("Đến")}: {fmtDate(p.endDate)} · {L("Chủ")}: {p.ownerName}</small>
                                                    </div>
                                                    <i className={`work-status work-status--${p.status === 1 ? "ok" : "info"}`}>{p.status === 1 ? L("Hoàn thành") : L("Đang hoạt động")}</i>
                                                </div>
                                                <div className="work-project-card-body">
                                                    {p.description && <p className="work-task-desc">{p.description}</p>}
                                                    <div className="work-project-card-stats">
                                                        <div className="work-ov-count work-ov-count--blue"><strong>{p.memberCount}</strong><span>{L("Thành viên")}</span></div>
                                                        {p.fileName && (
                                                            <a className="work-file-link" href={p.fileUrl} target="_blank" rel="noreferrer">📎 {p.fileName}</a>
                                                        )}
                                                    </div>
                                                    <div className="work-project-card-members">
                                                        <small style={{ color: "#8a99ab" }}>{L("Người nhận")}: </small>
                                                        {p.members?.length ? p.members.map((m) => <i key={m.id} className="work-member-chip">{m.name}</i>) : <span className="att-muted">{L("Chưa gán")}</span>}
                                                    </div>
                                                </div>
                                            </article>
                                        ))}
                                    </div>}
                            </div>
                        )}

                        {/* ============ HIỆU SUẤT ============ */}
                        {tab === "performance" && (
                            <div className="work-perf-page">
                                <div className="work-kanban-head">
                                    <span className="att-muted">{L("Bảng đánh giá KPI theo kỳ")}</span>
                                    {canManage && <button type="button" className="work-add-btn" onClick={openNewPerf}>+ {L("Đánh giá mới")}</button>}
                                </div>
                                {perfs.length === 0
                                    ? <div className="att-card"><p className="att-muted">{L("Chưa có đánh giá hiệu suất nào.")}</p></div>
                                    : <div className="work-perf-list">
                                        {myPerfs.map((p) => (
                                            <article key={p.id} className="work-perf">
                                                <div className="work-perf-head">
                                                    <div>
                                                        <strong>{p.periodLabel}</strong>
                                                        <small>{p.employeeEmployeeCode} · {p.employeeName} · {L("Đánh giá bởi")}: {p.ratedByName}</small>
                                                    </div>
                                                    <i className={`work-status work-status--${p.status === 2 ? "ok" : p.status === 1 ? "info" : "muted"}`}>
                                                        {p.status === 2 ? L("Đã xác nhận") : p.status === 1 ? L("Đã gửi") : L("Dự thảo")}
                                                    </i>
                                                </div>
                                                <div className="work-perf-score">
                                                    <span className="work-perf-avg">{avg(p)}/5</span>
                                                    <div className="work-perf-bars">
                                                        {[[p.quality, L("Chất lượng")], [p.timeliness, L("Đúng hạn")], [p.collaboration, L("Phối hợp")], [p.initiation, L("Chủ động")]].map(([v, label]) => (
                                                            <div key={label} className="work-perf-bar">
                                                                <span>{label}</span>
                                                                <div className="work-perf-bar-track"><div style={{ width: `${(v / 5) * 100}%` }} /></div>
                                                                <em>{v}</em>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                {p.strengths && <div className="work-perf-note"><strong>{L("Điểm mạnh")}</strong><p>{p.strengths}</p></div>}
                                                {p.improvements && <div className="work-perf-note"><strong>{L("Cần cải thiện")}</strong><p>{p.improvements}</p></div>}
                                                {p.overallComment && <div className="work-perf-note work-perf-note--all"><strong>{L("Nhận xét chung")}</strong><p>{p.overallComment}</p></div>}
                                                {!canManage && p.status === 1 && (
                                                    <div className="work-perf-confirm">
                                                        <p>{L("Bạn xác nhận đã đọc và đồng ý với đánh giá này?")}</p>
                                                        <button type="button" className="work-add-btn" disabled={busy} onClick={() => confirmPerf(p)}>{L("Xác nhận")}</button>
                                                    </div>
                                                )}
                                            </article>
                                        ))}
                                    </div>}
                            </div>
                        )}
                    </>
                )}

                {/* ============ Modal: Chi tiết nhiệm vụ ============ */}
                {openTask && (
                    <div className="work-overlay" onMouseDown={(e) => e.target === e.currentTarget && setOpenTask(null)}>
                        <section className="att-detail-modal work-task-modal">
                            <header className="att-detail-modal-head">
                                <div><h2>{openTask.title}</h2><p>{L("Người giao")}: {openTask.assignedByName} · {L("Hạn")}: {fmtDate(openTask.dueDate)}</p></div>
                                <button type="button" onClick={() => setOpenTask(null)} aria-label={L("Đóng")}>×</button>
                            </header>
                            <div className="work-task-meta"><PriorityTag p={openTask.priority} /><TaskBadge status={openTask.status} /></div>
                            {openTask.description && <p className="work-task-desc">{openTask.description}</p>}
                            <div className="work-card-progress work-task-progress"><div style={{ width: `${openTask.status === 2 ? 100 : openTask.progressPercent}%` }} /></div>
                            <div className="work-task-pct">{L("Tiến độ")}: {openTask.status === 2 ? 100 : openTask.progressPercent}%</div>
                            <h4>{L("Bình luận")} ({comments.length})</h4>
                            <div className="work-comments">
                                {comments.length === 0 && <p className="att-muted">{L("Chưa có bình luận nào.")}</p>}
                                {comments.map((cm) => (
                                    <div key={cm.id} className="work-comment">
                                        <strong>{cm.authorName}</strong>
                                        <small>{new Date(cm.createdTime).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</small>
                                        <p>{cm.content}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="work-comment-input">
                                <textarea rows={2} value={commentText} placeholder={L("Nhập bình luận...")} onChange={(e) => setCommentText(e.target.value)} />
                                <button type="button" className="work-add-btn" disabled={!commentText.trim()} onClick={submitComment}>{L("Gửi")}</button>
                            </div>
                        </section>
                    </div>
                )}

                {/* ============ Modal: Tạo dự án / Giao việc (v2 - color + scroll) ============ */}
                {showProject && (
                    <div className="work-overlay" onMouseDown={(e) => e.target === e.currentTarget && setShowProject(false)}>
                        <section className="att-detail-modal work-assign-modal work-assign-modal--v2">
                            <header className="att-detail-modal-head">
                                <div>
                                    <h2>{L("Tạo dự án & giao việc")}</h2>
                                    <p className="work-scope-hint">{L("Chỉ giao việc cho cấp dưới của bạn.")}</p>
                                </div>
                                <button type="button" onClick={() => setShowProject(false)} aria-label={L("Đóng")}>×</button>
                            </header>

                            {/* PREVIEW: trên = màu chọn, dưới = trắng (bắt buộc) */}
                            <div className="work-pj-preview">
                                <div className="work-pj-preview-top" style={{ background: projectForm.color }}>
                                    <span aria-hidden="true">◈</span> {projectForm.name || L("Tên dự án")}
                                </div>
                                <div className="work-pj-preview-bottom">
                                    <small>{projectForm.startDate} → {projectForm.endDate} · {L("Giao cho")}: {projectForm.memberIds.length} {L("người")}</small>
                                </div>
                            </div>

                            <div className="work-assign-form">
                                <label>{L("Tên dự án")}
                                    <input value={projectForm.name} placeholder={L("VD: Dự án nâng cấp website")}
                                        onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} autoFocus />
                                </label>
                                <label>{L("Mô tả")}
                                    <textarea rows={2} value={projectForm.description}
                                        onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                                        placeholder={L("Nội dung, mục tiêu công việc...")} />
                                </label>

                                <div className="work-assign-row">
                                    <label>{L("Từ ngày")}
                                        <input type="date" value={projectForm.startDate} min={todayISO()}
                                            onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })} />
                                    </label>
                                    <label>{L("Đến ngày")}
                                        <input type="date" value={projectForm.endDate} min={projectForm.startDate}
                                            onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })} />
                                    </label>
                                </div>

                                <label>{L("Màu chủ đạo dự án")}
                                    <div className="work-color-pick">
                                        {PROJECT_COLORS.map((c) => (
                                            <button key={c} type="button"
                                                className={`work-color-swatch${projectForm.color === c ? " on" : ""}`}
                                                style={{ background: c }}
                                                title={c}
                                                onClick={() => setProjectForm({ ...projectForm, color: c })} />
                                        ))}
                                    </div>
                                </label>

                                <label>{L("Gửi file đính kèm")}
                                    <input ref={fileRef} type="file"
                                        onChange={(e) => setProjectForm({ ...projectForm, file: e.target.files?.[0] || null })} />
                                    {projectForm.file && <small className="work-file-hint">{projectForm.file.name} ({Math.round(projectForm.file.size / 1024)} KB)</small>}
                                </label>

                                <div className="work-member-pick">
                                    <label>{L("Chọn người nhận (cấp dưới)")}
                                        <small className="att-muted">{assignable.length} {L("người")} · {projectForm.memberIds.length} {L("được chọn")}</small>
                                    </label>
                                    {assignable.length === 0
                                        ? <p className="att-muted work-scope-empty">{L("Bạn chưa có cấp dưới để giao việc.")}</p>
                                        : <div className="work-member-list work-member-list--scroll">
                                            {assignable.map((emp) => (
                                                <label key={emp.id} className={`work-member-row${projectForm.memberIds.includes(emp.id) ? " on" : ""}`}>
                                                    <input type="checkbox" checked={projectForm.memberIds.includes(emp.id)} onChange={() => toggleMember(emp.id)} />
                                                    <span className="work-member-name">{emp.name}</span>
                                                    <span className="work-member-meta">{emp.employeeCode}{emp.positionName ? ` · ${emp.positionName}` : ""}</span>
                                                    {emp.departmentName && <span className="work-member-dept">{emp.departmentName}</span>}
                                                </label>
                                            ))}
                                        </div>}
                                </div>

                                <div className="work-form-actions">
                                    <button type="button" className="admin-link-btn" onClick={() => setShowProject(false)}>{L("Hủy")}</button>
                                    <button type="button" className="work-add-btn" disabled={busy || !assignable.length} onClick={submitProject}>{L("Tạo & giao")}</button>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {/* ============ Modal: Đánh giá hiệu suất ============ */}
                {showPerf && canManage && (
                    <div className="work-overlay" onMouseDown={(e) => e.target === e.currentTarget && setShowPerf(false)}>
                        <section className="att-detail-modal work-perf-modal">
                            <header className="att-detail-modal-head">
                                <div><h2>{L("Đánh giá hiệu suất")}</h2></div>
                                <button type="button" onClick={() => setShowPerf(false)} aria-label={L("Đóng")}>×</button>
                            </header>
                            <div className="work-assign-form">
                                <label>{L("Nhân viên")}
                                    <select value={perfForm.employeeId} onChange={(e) => setPerfForm({ ...perfForm, employeeId: e.target.value })}>
                                        <option value="">{L("Chọn nhân viên...")}</option>
                                        {subordinates.map((emp) => <option key={emp.id} value={emp.id}>{emp.employeeCode} · {emp.name}</option>)}
                                    </select>
                                </label>
                                <label>{L("Kỳ đánh giá")}<input type="month" value={perfForm.period} onChange={(e) => setPerfForm({ ...perfForm, period: e.target.value })} /></label>
                                <div className="work-perf-scores">
                                    {[["quality", "Chất lượng"], ["timeliness", "Đúng hạn"], ["collaboration", "Phối hợp"], ["initiation", "Chủ động"]].map(([key, label]) => (
                                        <div key={key} className="work-perf-score-row"><span>{L(label)}</span><Stars value={perfForm[key]} onChange={(v) => setPerfForm({ ...perfForm, [key]: v })} /></div>
                                    ))}
                                </div>
                                <label>{L("Điểm mạnh")}<textarea rows={2} value={perfForm.strengths} onChange={(e) => setPerfForm({ ...perfForm, strengths: e.target.value })} /></label>
                                <label>{L("Cần cải thiện")}<textarea rows={2} value={perfForm.improvements} onChange={(e) => setPerfForm({ ...perfForm, improvements: e.target.value })} /></label>
                                <label>{L("Nhận xét chung")}<textarea rows={2} value={perfForm.overallComment} onChange={(e) => setPerfForm({ ...perfForm, overallComment: e.target.value })} /></label>
                                <div className="work-form-actions">
                                    <button type="button" className="admin-link-btn" onClick={() => setShowPerf(false)}>{L("Hủy")}</button>
                                    <button type="button" className="work-add-btn" disabled={busy} onClick={submitPerf}>{L("Gửi đánh giá")}</button>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </WorkLayout>
    );
};

export default WorkPage;
