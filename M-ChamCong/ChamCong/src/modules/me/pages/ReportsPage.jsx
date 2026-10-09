import { useCallback, useEffect, useState } from "react";
import AppLayout from "../../../components/layout/AppLayout";
import reportApi from "../api/reportApi";
import "../my-reports.css";

const statusInfo = { 0: ["Chờ quản lý duyệt", "pending"], 1: ["Quản lý đã duyệt", "approved"], 2: ["Từ chối", "rejected"], 3: ["Yêu cầu chỉnh sửa", "rejected"], 4: ["Đã gửi cấp trên", "sent"], 5: ["Cấp trên đã duyệt", "approved"], 6: ["Cấp trên yêu cầu bổ sung", "rejected"], 7: ["Hoàn tất", "approved"] };
const date = (value) => value ? new Date(value).toLocaleDateString("vi-VN") : "—";

export default function MyReportsPage() {
    const [reports, setReports] = useState([]);
    const [selected, setSelected] = useState(null);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ title: "", reportType: "", period: new Date().toISOString().slice(0, 7), deadline: "", file: null, files: [], overview: "", results: "", issues: "", recommendations: "" });
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const load = useCallback(async () => { setLoading(true); try { setReports((await reportApi.mine()).data.data || []); } catch (err) { setError(err.response?.data?.message || "Không tải được báo cáo."); } finally { setLoading(false); } }, []);
    useEffect(() => { load(); }, [load]);
    const create = (report = null) => { setEditing(report || {}); setForm({ title: report?.title || "", reportType: report?.reportType || "", period: report?.period?.slice(0, 7) || new Date().toISOString().slice(0, 7), deadline: report?.deadline?.slice(0, 10) || "", file: null, files: [], overview: report?.overview || "", results: report?.results || "", issues: report?.issues || "", recommendations: report?.recommendations || "" }); setError(""); };
    const submit = async (event) => {
        event.preventDefault();
        if (!form.file) { setError("Chọn file báo cáo trước khi gửi."); return; }
        const data = new FormData();
        if (editing?.id) data.append("reportId", editing.id);
        data.append("title", form.title); data.append("reportType", form.reportType); data.append("period", form.period); data.append("deadline", form.deadline); data.append("file", form.file);
        for (const file of form.files) data.append("files", file);
        for (const key of ["overview", "results", "issues", "recommendations"]) data.append(key, form[key]);
        setBusy(true);
        try { await reportApi.submit(data); setEditing(null); await load(); }
        catch (err) { setError(err.response?.data?.message || "Không thể gửi báo cáo."); }
        finally { setBusy(false); }
    };
    const download = async (version, attachment = false) => { try { const response = await (attachment ? reportApi.downloadAttachment(version.id) : reportApi.download(version.id)); const url = URL.createObjectURL(response.data); const link = document.createElement("a"); link.href = url; link.download = version.fileName; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch { setError("Không tải được file."); } };
    const total = reports.length;
    return <AppLayout title="Báo cáo của tôi" subtitle="Gửi file báo cáo và theo dõi kết quả duyệt">
        <main className="my-reports">
            <header className="my-reports-head"><div><h2>Hồ sơ báo cáo</h2><p>Theo dõi báo cáo đã gửi cho quản lý.</p></div><button className="my-report-primary" onClick={() => create()}>＋ Nộp báo cáo</button></header>
            {error && <div className="my-report-error">{error}<button onClick={() => setError("")}>×</button></div>}
            <div className="my-report-stats"><div><small>Tổng báo cáo</small><strong>{total}</strong></div><div><small>Chờ duyệt</small><strong>{reports.filter((r) => r.status === 0).length}</strong></div><div><small>Đã duyệt</small><strong>{reports.filter((r) => [1, 5, 7].includes(r.status)).length}</strong></div><div><small>Cần chỉnh sửa</small><strong>{reports.filter((r) => [2, 3, 6].includes(r.status)).length}</strong></div></div>
            <section className="my-report-list"><h3>Danh sách báo cáo</h3>{loading ? <p>Đang tải…</p> : reports.length ? reports.map((report) => <article key={report.id} className="my-report-row"><div className="my-report-icon">▤</div><div className="my-report-info"><strong>{report.title}</strong><span>{report.reportCode} · {report.reportType} · Kỳ {new Date(report.period).toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" })}</span><small>Gửi ngày {date(report.submittedAt)} · {report.versions?.at(-1)?.fileName}</small>{report.managerComment && <small className="my-report-comment">Ý kiến quản lý: {report.managerComment}</small>}{report.upperRequest && <small className="my-report-comment">Yêu cầu cấp trên: {report.upperRequest}</small>}</div><i className={`my-report-status ${statusInfo[report.status]?.[1]}`}>{statusInfo[report.status]?.[0]}</i><div className="my-report-row-actions"><button onClick={() => setSelected(report)}>Chi tiết</button>{[2, 3, 6].includes(report.status) && <button onClick={() => create(report)}>Nộp lại</button>}</div></article>) : <p className="my-report-empty">Bạn chưa nộp báo cáo nào.</p>}</section>
            {editing !== null && <div className="my-report-overlay" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}><form className="my-report-modal" onSubmit={submit}><header><h3>{editing.id ? "Nộp lại báo cáo" : "Nộp báo cáo mới"}</h3><button type="button" onClick={() => setEditing(null)}>×</button></header><label>Tên báo cáo *<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Báo cáo doanh thu tháng 09"/></label><label>Loại báo cáo *<input required value={form.reportType} onChange={(e) => setForm({ ...form, reportType: e.target.value })} placeholder="Doanh thu, Nhân sự…"/></label><div className="my-report-dates"><label>Kỳ báo cáo *<input required type="month" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}/></label><label>Deadline<input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}/></label></div><label>Tổng quan<textarea value={form.overview} onChange={(e) => setForm({ ...form, overview: e.target.value })}/></label><label>Kết quả thực hiện<textarea value={form.results} onChange={(e) => setForm({ ...form, results: e.target.value })}/></label><label>Khó khăn / vấn đề<textarea value={form.issues} onChange={(e) => setForm({ ...form, issues: e.target.value })}/></label><label>Kiến nghị / đề xuất<textarea value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })}/></label><label>File báo cáo *<input required={!editing.id} type="file" accept=".pdf,.xls,.xlsx,.doc,.docx" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] })}/><small>File chính · PDF, Excel, Word · tổng dung lượng tối đa 20 MB</small></label><label>File đính kèm<input multiple type="file" accept=".pdf,.xls,.xlsx,.doc,.docx" onChange={(e) => setForm({ ...form, files: [...e.target.files] })}/></label><footer><button type="button" onClick={() => setEditing(null)}>Hủy</button><button className="my-report-primary" disabled={busy}>{busy ? "Đang gửi…" : "Gửi báo cáo"}</button></footer></form></div>}
            {selected && <div className="my-report-overlay" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><section className="my-report-modal"><header><h3>Chi tiết báo cáo</h3><button onClick={() => setSelected(null)}>×</button></header><h4>{selected.title}</h4><p>{selected.reportCode} · {selected.reportType} · Kỳ {date(selected.period).slice(-7)}</p><i className={`my-report-status ${statusInfo[selected.status]?.[1]}`}>{statusInfo[selected.status]?.[0]}</i>{selected.managerComment && <div className="my-report-comment">Ý kiến quản lý: {selected.managerComment}</div>}{selected.upperRequest && <div className="my-report-comment">Yêu cầu cấp trên: {selected.upperRequest}</div>}{[["Tổng quan", selected.overview], ["Kết quả thực hiện", selected.results], ["Khó khăn / vấn đề", selected.issues], ["Kiến nghị / đề xuất", selected.recommendations]].filter(([, value]) => value).map(([label, value]) => <div className="my-report-content" key={label}><strong>{label}</strong><p>{value}</p></div>)}<h4>Lịch sử phiên bản</h4>{selected.versions?.map((version) => <div className="my-report-version" key={version.id}><span>v{version.version} · {version.fileName}<small>{date(version.uploadedAt)}</small></span><button onClick={() => download(version)}>Tải file</button>{version.attachments?.map((attachment) => <button key={attachment.id} onClick={() => download(attachment, true)}>{attachment.fileName}</button>)}</div>)}<button className="my-report-close" onClick={() => setSelected(null)}>Đóng</button></section></div>}
        </main>
    </AppLayout>;
}
