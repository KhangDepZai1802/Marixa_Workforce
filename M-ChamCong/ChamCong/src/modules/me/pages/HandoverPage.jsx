import { useCallback, useEffect, useState } from "react";
import axiosClient from "../../../services/api/axiosClient";
import { localeForLanguage, translate, useLanguage } from "../../../services/i18n/LanguageProvider";
import AppLayout from "../../../components/layout/AppLayout";
import HrAppLayout from "../../employees/hr/layout/HrAppLayout";
import HrHero from "../../employees/hr/HrHero";
import "../handover.css";

const dataOf = (response) => response?.data?.data;
const statusLabels = ["Chờ duyệt", "Đã duyệt", "Từ chối"];
const initialAssets = (language) => [
    { assetType: translate("Màn hình máy tính", language), assetCode: "TS-MH-001", condition: "Tốt", note: "" },
    { assetType: "CPU", assetCode: "TS-CPU-001", condition: "Tốt", note: "" },
    { assetType: "PC", assetCode: "TS-PC-001", condition: "Đang sử dụng", note: "" },
    { assetType: translate("Bàn phím", language), assetCode: "TS-BP-001", condition: "Tốt", note: "" },
    { assetType: translate("Chuột", language), assetCode: "TS-CH-001", condition: "Tốt", note: "" },
];
const initialProjects = (language) => [
    { projectCode: "DA-001", projectName: "Website ABC", partner: translate("Công ty ABC", language), progress: 80, documents: [], handoverFiles: [] },
    { projectCode: "DA-002", projectName: "Mobile App XYZ", partner: translate("Công ty XYZ", language), progress: 45, documents: [], handoverFiles: [] },
];
const parseJson = (value) => { try { return JSON.parse(value || "[]"); } catch { return []; } };
const assetsOf = (row) => parseJson(row.assetsJson ?? row.AssetsJson).map((x) => ({ assetType: x.assetType ?? x.AssetType, assetCode: x.assetCode ?? x.AssetCode, condition: x.condition ?? x.Condition, note: x.note ?? x.Note }));
const projectsOf = (row) => parseJson(row.projectsJson ?? row.ProjectsJson).map((x) => ({
    projectCode: x.projectCode ?? x.ProjectCode, projectName: x.projectName ?? x.ProjectName,
    partner: x.partner ?? x.Partner, progress: x.progress ?? x.Progress,
    documents: (x.documents ?? x.Documents ?? []).map((file) => ({ fileName: file.fileName ?? file.FileName, storedName: file.storedName ?? file.StoredName, fileSize: file.fileSize ?? file.FileSize })),
    handoverFiles: (x.handoverFiles ?? x.HandoverFiles ?? []).map((file) => ({ fileName: file.fileName ?? file.FileName, storedName: file.storedName ?? file.StoredName, fileSize: file.fileSize ?? file.FileSize })),
}));
const fileSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
const today = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const dateLabel = (value, locale) => value
    ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(locale)
    : "—";
const L = (text, language) => language === "vi" ? text : translate(text, language);

// ===== Thành phần xem (cùng dùng cho card lịch sử + dialog duyệt) =====

const StatusBadge = ({ status }) => (
    <span className={`hv-badge hv-badge--${status}`}>
        {statusLabels[status] || L("Không rõ")}
    </span>
);

const FileList = ({ files = [], onDownload }) => files.length
    ? <div className="hv-file-list">{files.map((file, index) => (
        <button
            type="button"
            key={`${file.storedName}-${index}`}
            className="hv-file"
            title={`${file.fileName} · ${fileSize(file.fileSize)}`}
            onClick={() => onDownload?.(file)}
        >
            <span className="hv-file-ico">📎</span>
            <span className="hv-file-name">{file.fileName}</span>
            <span className="hv-file-size">{fileSize(file.fileSize)}</span>
        </button>
    ))}</div>
    : <span className="hv-muted">—</span>;

const AssetTable = ({ assets }) => (
    <div className="hv-table-wrap">
        <table className="hv-table">
            <thead>
                <tr><th>STT</th><th>Loại tài sản</th><th>Mã tài sản</th><th>Tình trạng</th><th>Ghi chú</th></tr>
            </thead>
            <tbody>
                {assets.length ? assets.map((asset, i) => (
                    <tr key={`${asset.assetCode}-${i}`}>
                        <td className="hv-td-num">{String(i + 1).padStart(2, "0")}</td>
                        <td>{asset.assetType}</td>
                        <td>{asset.assetCode}</td>
                        <td><span className={`hv-cond hv-cond--${String(asset.condition || "").toLowerCase().includes("hư") || asset.condition === "Thất lạc" ? "bad" : asset.condition === "Tốt" ? "ok" : ""}`}>{asset.condition || "—"}</span></td>
                        <td>{asset.note || "—"}</td>
                    </tr>
                )) : (
                    <tr><td colSpan="5" className="hv-empty-cell">Không có tài sản được khai báo.</td></tr>
                )}
            </tbody>
        </table>
    </div>
);

const ProjectTable = ({ projects, onDownload }) => (
    <div className="hv-table-wrap">
        <table className="hv-table">
            <thead>
                <tr><th>STT</th><th>Mã dự án</th><th>Tên dự án</th><th>Đối tác</th><th>Tiến độ</th><th>Tài liệu dự án</th><th>File bàn giao</th></tr>
            </thead>
            <tbody>
                {projects.length ? projects.map((project, i) => (
                    <tr key={`${project.projectCode}-${i}`}>
                        <td className="hv-td-num">{String(i + 1).padStart(2, "0")}</td>
                        <td>{project.projectCode}</td>
                        <td>{project.projectName}</td>
                        <td>{project.partner || "—"}</td>
                        <td>
                            <div className="hv-progress">
                                <div className="hv-progress-track"><div className="hv-progress-fill" style={{ width: `${Math.min(100, Math.max(0, Number(project.progress) || 0))}%` }} /></div>
                                <span>{project.progress}%</span>
                            </div>
                        </td>
                        <td><FileList files={project.documents} onDownload={(file) => onDownload?.(file)} /></td>
                        <td><FileList files={project.handoverFiles} onDownload={(file) => onDownload?.(file)} /></td>
                    </tr>
                )) : (
                    <tr><td colSpan="7" className="hv-empty-cell">Chưa có dự án bàn giao.</td></tr>
                )}
            </tbody>
        </table>
    </div>
);

// ===== Form tạo yêu cầu: 3 bước =====

const STEPS = [
    { id: 1, label: "Thông tin", hint: "Ngày & lý do" },
    { id: 2, label: "Tài sản", hint: "Thiết bị công ty" },
    { id: 3, label: "Dự án", hint: "Tiến độ & file" },
];

const HandoverForm = ({ form, setForm, submitting, onSubmit, locale }) => {
    const [step, setStep] = useState(1);
    const [touched, setTouched] = useState({});

    const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));
    const updateAsset = (index, key, value) =>
        setForm((prev) => ({ ...prev, assets: prev.assets.map((item, i) => (i === index ? { ...item, [key]: value } : item)) }));
    const updateProject = (index, key, value) =>
        setForm((prev) => ({ ...prev, projects: prev.projects.map((item, i) => (i === index ? { ...item, [key]: value } : item)) }));

    const step1Invalid = !form.lastWorkingDate || !form.reason.trim();
    const step2Invalid = form.assets.some((a) => !a.assetType.trim());
    const step3Invalid = form.projects.length === 0 || form.projects.some((p) => !p.projectName.trim() || p.documents.length === 0 || p.handoverFiles.length === 0);

    const canNext = step === 1 ? !step1Invalid : step === 2 ? !step2Invalid : !step3Invalid;

    const goNext = () => {
        setTouched((t) => ({ ...t, [step]: true }));
        if (!canNext) return;
        setStep((s) => Math.min(3, s + 1));
    };

    return (
        <form className="hv-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
            {/* Thanh bước */}
            <ol className="hv-steps">
                {STEPS.map((s) => {
                    const active = step === s.id;
                    const done = step > s.id;
                    return (
                        <li key={s.id} className={active ? "active" : done ? "done" : ""}>
                            <button
                                type="button"
                                className="hv-step-dot"
                                onClick={() => s.id < step && setStep(s.id)}
                                disabled={s.id >= step}
                                aria-label={`Bước ${s.id}: ${s.label}`}
                            >
                                {done ? "✓" : s.id}
                            </button>
                            <span className="hv-step-label">{s.label}</span>
                            <small>{s.hint}</small>
                        </li>
                    );
                })}
            </ol>

            {/* ===== Bước 1: thông tin ===== */}
            {step === 1 && (
                <div className="hv-step-body">
                    <div className="hv-grid-2">
                        <label className={touched[1] && !form.lastWorkingDate ? "hv-field invalid" : "hv-field"}>
                            <span>Ngày làm việc cuối cùng <em>*</em></span>
                            <input type="date" min={today()} required value={form.lastWorkingDate}
                                onChange={(e) => update({ lastWorkingDate: e.target.value })} />
                        </label>
                        <label className="hv-field">
                            <span>Ngày gửi hôm nay</span>
                            <input value={dateLabel(today(), locale)} disabled />
                        </label>
                    </div>
                    <label className={touched[1] && !form.reason.trim() ? "hv-field invalid" : "hv-field"}>
                        <span>Lý do nghỉ việc <em>*</em></span>
                        <textarea required maxLength={2000} rows={3} placeholder="VD: Lý do cá nhân, hoàn cảnh gia đình..."
                            value={form.reason} onChange={(e) => update({ reason: e.target.value })} />
                        <small>{form.reason.length}/2000</small>
                    </label>
                </div>
            )}

            {/* ===== Bước 2: tài sản ===== */}
            {step === 2 && (
                <div className="hv-step-body">
                    <div className="hv-section-head">
                        <div>
                            <h3>Tài sản công ty cần bàn giao</h3>
                            <p className="hv-muted">Thiết bị, dụng cụ công ty giao khi nhận việc.</p>
                        </div>
                        <button type="button" className="hv-btn hv-btn--ghost"
                            onClick={() => setForm((prev) => ({ ...prev, assets: [...prev.assets, { assetType: "", assetCode: "", condition: "Tốt", note: "" }] }))}>
                            ＋ Thêm tài sản
                        </button>
                    </div>
                    <div className="hv-table-wrap">
                        <table className="hv-table hv-table--edit">
                            <thead>
                                <tr><th>STT</th><th>Loại tài sản</th><th>Mã tài sản</th><th>Tình trạng</th><th>Ghi chú</th><th /></tr>
                            </thead>
                            <tbody>
                                {form.assets.map((asset, index) => (
                                    <tr key={index} className={touched[2] && !asset.assetType.trim() ? "hv-row-invalid" : ""}>
                                        <td className="hv-td-num">{String(index + 1).padStart(2, "0")}</td>
                                        <td>
                                            <input aria-label="Loại tài sản" value={asset.assetType} placeholder="VD: Laptop"
                                                onChange={(e) => updateAsset(index, "assetType", e.target.value)} />
                                        </td>
                                        <td>
                                            <input aria-label="Mã tài sản" value={asset.assetCode} placeholder="TS-XX-000"
                                                onChange={(e) => updateAsset(index, "assetCode", e.target.value)} />
                                        </td>
                                        <td>
                                            <select aria-label="Tình trạng" value={asset.condition}
                                                onChange={(e) => updateAsset(index, "condition", e.target.value)}>
                                                <option>Tốt</option><option>Đang sử dụng</option><option>Hư hỏng</option><option>Thất lạc</option><option>Đã bàn giao</option>
                                            </select>
                                        </td>
                                        <td>
                                            <input aria-label="Ghi chú tài sản" value={asset.note}
                                                onChange={(e) => updateAsset(index, "note", e.target.value)} />
                                        </td>
                                        <td>
                                            <button type="button" className="hv-btn-remove" aria-label="Xóa tài sản"
                                                onClick={() => setForm((prev) => ({ ...prev, assets: prev.assets.filter((_, i) => i !== index) }))}>×</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ===== Bước 3: dự án ===== */}
            {step === 3 && (
                <div className="hv-step-body">
                    <div className="hv-section-head">
                        <div>
                            <h3>Tiến độ & bàn giao công việc</h3>
                            <p className="hv-muted">Dự án đang phụ trách, tài liệu và file bàn giao.</p>
                        </div>
                        <button type="button" className="hv-btn hv-btn--ghost"
                            onClick={() => setForm((prev) => ({ ...prev, projects: [...prev.projects, { projectCode: "", projectName: "", partner: "", progress: 0, documents: [], handoverFiles: [] }] }))}>
                            ＋ Thêm dự án
                        </button>
                    </div>
                    {form.projects.map((project, index) => (
                        <div key={index} className="hv-project-card">
                            <div className="hv-project-head">
                                <span className="hv-project-index">{String(index + 1).padStart(2, "0")}</span>
                                <div className="hv-project-fields">
                                    <div className="hv-grid-4">
                                        <label className="hv-field">
                                            <span>Mã dự án</span>
                                            <input value={project.projectCode} onChange={(e) => updateProject(index, "projectCode", e.target.value)} />
                                        </label>
                                        <label className={touched[3] && !project.projectName.trim() ? "hv-field invalid" : "hv-field"}>
                                            <span>Tên dự án <em>*</em></span>
                                            <input value={project.projectName} onChange={(e) => updateProject(index, "projectName", e.target.value)} />
                                        </label>
                                        <label className="hv-field">
                                            <span>Đối tác</span>
                                            <input value={project.partner} onChange={(e) => updateProject(index, "partner", e.target.value)} />
                                        </label>
                                        <label className="hv-field">
                                            <span>Tiến độ</span>
                                            <div className="hv-progress-input">
                                                <input type="number" min="0" max="100" value={project.progress}
                                                    onChange={(e) => updateProject(index, "progress", Math.min(100, Math.max(0, Number(e.target.value))))} />
                                                <span>%</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                                <button type="button" className="hv-btn-remove hv-btn-remove--lg" aria-label="Xóa dự án"
                                    onClick={() => setForm((prev) => ({ ...prev, projects: prev.projects.filter((_, i) => i !== index) }))}>×</button>
                            </div>

                            <div className="hv-project-files">
                                {["documents", "handoverFiles"].map((kind) => (
                                    <div key={kind} className="hv-file-block">
                                        <strong>{kind === "documents" ? "Tài liệu dự án" : "File bàn giao"} <em>*</em></strong>
                                        <label className="hv-upload">
                                            ＋ Chọn file
                                            <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                                                onChange={(e) => {
                                                    const files = Array.from(e.target.files || []);
                                                    setForm((prev) => ({ ...prev, projects: prev.projects.map((item, i) => (i === index ? { ...item, [kind]: [...item[kind], ...files] } : item)) }));
                                                    e.target.value = "";
                                                }} />
                                        </label>
                                        {project[kind].length > 0 && (
                                            <div className="hv-pending-files">
                                                {project[kind].map((file, fileIndex) => (
                                                    <button type="button" key={`${file.name}-${fileIndex}`} title={L("Xóa tệp đã chọn")}
                                                        onClick={() => setForm((prev) => ({ ...prev, projects: prev.projects.map((item, i) => (i === index ? { ...item, [kind]: item[kind].filter((_, j) => j !== fileIndex) } : item)) }))}>
                                                        📎 {file.name} <span>×</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    <p className="hv-hint">
                        Tình trạng tài khoản công ty được đính kèm tự động. Hồ sơ chỉ chuyển sang danh sách nghỉ việc sau khi được cấp trên duyệt.
                    </p>
                </div>
            )}

            {/* Thanh điều hướng */}
            <div className="hv-form-actions">
                {step > 1 && (
                    <button type="button" className="hv-btn hv-btn--ghost" onClick={() => setStep((s) => s - 1)}>← Trước</button>
                )}
                {step < 3 ? (
                    <button type="button" className="hv-btn hv-btn--primary" onClick={goNext}>Tiếp tục →</button>
                ) : (
                    <>
                        {step3Invalid && (
                            <p className="hv-form-err">
                                {!form.projects.some((p) => p.documents.length > 0 && p.handoverFiles.length > 0)
                                    ? "Mỗi dự án cần ít nhất 1 tài liệu dự án và 1 file bàn giao thì mới gửi được cho cấp trên."
                                    : "Vui lòng hoàn thiện tên dự án, tài liệu dự án và file bàn giao."}
                            </p>
                        )}
                        <button type="submit" className="hv-btn hv-btn--primary" disabled={submitting || !canNext}>
                            {submitting ? "Đang gửi..." : "✓ Gửi cấp trên duyệt"}
                        </button>
                    </>
                )}
            </div>
        </form>
    );
};

// ===== Card lịch sử =====

const HandoverCard = ({ row, locale, reviewMode, onDownload, onReview }) => {
    const [expanded, setExpanded] = useState(false);
    const assets = assetsOf(row);
    const projects = projectsOf(row);
    const pendingFiles = projects.reduce((n, p) => n + p.documents.length + p.handoverFiles.length, 0);

    return (
        <article className={`hv-card${expanded ? " expanded" : ""}`}>
            <div className="hv-card-top">
                <div className="hv-card-id">
                    <span className="hv-avatar">{row.employeeName ? row.employeeName.slice(0, 2).toUpperCase() : "NV"}</span>
                    <div>
                        <h3>{reviewMode ? row.employeeName : "Yêu cầu bàn giao nghỉ việc"}</h3>
                        <p className="hv-muted">
                            {reviewMode
                                ? `${row.employeeCode} · ${row.departmentName || L("Chưa có phòng ban")}`
                                : `Quản lý duyệt: ${row.managerName}`}
                        </p>
                    </div>
                </div>
                <StatusBadge status={row.status} />
            </div>

            <div className="hv-card-facts">
                <div><small>Ngày làm việc cuối</small><b>{dateLabel(row.lastWorkingDate, locale)}</b></div>
                <div><small>Tài khoản công ty</small><b>{row.accountIssued ? L("Đã cấp") : L("Chưa cấp")}</b></div>
                <div><small>Gửi ngày</small><b>{row.createdTime ? new Date(row.createdTime).toLocaleDateString(locale) : "—"}</b></div>
                <div><small>{L("File đính kèm")}</small><b>{pendingFiles} {L("tệp")}</b></div>
            </div>

            <p className="hv-reason"><strong>Lý do:</strong> {row.reason}</p>

            {row.reviewNote && (
                <p className={`hv-review-note${row.status === 2 ? " rejected" : ""}`}>
                    <strong>Phản hồi cấp trên:</strong> {row.reviewNote}
                    {row.reviewedByName ? ` — ${row.reviewedByName}` : ""}
                </p>
            )}

            {expanded && (
                <div className="hv-card-detail">
                    <h4>Tài sản công ty</h4>
                    <AssetTable assets={assets} />
                    <h4>Dự án & tiến độ</h4>
                    <ProjectTable projects={projects} onDownload={(file) => onDownload?.(row.id, file)} />
                </div>
            )}

            <div className="hv-card-actions">
                <button type="button" className="hv-btn hv-btn--ghost" onClick={() => setExpanded((v) => !v)}>
                    {expanded ? "Thu gọn chi tiết" : "Xem tài sản & dự án"}
                </button>
                {reviewMode && row.status === 0 && (
                    <button type="button" className="hv-btn hv-btn--primary" onClick={() => onReview(row)}>Xử lý duyệt</button>
                )}
            </div>
        </article>
    );
};

// ===== Dialog duyệt =====

const ReviewDialog = ({ selected, locale, saving, onDownload, onApprove, onReject, onClose }) => {
    const [note, setNote] = useState("");
    const assets = assetsOf(selected);
    const projects = projectsOf(selected);
    return (
        <div className="hv-overlay" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
            <section className="hv-dialog" role="dialog" aria-modal="true">
                <button className="hv-close" onClick={onClose} disabled={saving}>×</button>
                <span className="hv-eyebrow">DUYỆT BÀN GIAO</span>
                <h2>{selected.employeeName}</h2>
                <p className="hv-muted">{selected.employeeCode} · {selected.departmentName || L("Chưa có phòng ban")}</p>

                <div className="hv-dialog-facts">
                    <div><small>Ngày làm việc cuối</small><b>{dateLabel(selected.lastWorkingDate, locale)}</b></div>
                    <div><small>Tài khoản công ty</small><b>{selected.accountIssued ? L("Đã cấp") : L("Chưa cấp")}</b></div>
                    <div><small>Tài sản khai báo</small><b>{assets.length} {L("mục")}</b></div>
                    <div><small>Dự án</small><b>{projects.length} {L("dự án")}</b></div>
                </div>

                <p className="hv-reason"><strong>Lý do nghỉ việc:</strong> {selected.reason}</p>

                <div className="hv-dialog-detail">
                    <h4>Tài sản công ty</h4>
                    <AssetTable assets={assets} />
                    <h4>Dự án & tiến độ</h4>
                    <ProjectTable projects={projects} onDownload={(file) => onDownload(selected.id, file)} />
                </div>

                <label className="hv-field">
                    <span>Ý kiến duyệt <em>*(bắt buộc khi từ chối)</em></span>
                    <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                        placeholder="Nhập ý kiến hoặc lý do từ chối..." />
                </label>

                <footer>
                    <button type="button" className="hv-btn hv-btn--danger" disabled={saving || !note.trim()}
                        onClick={() => onReject(note)}>Từ chối</button>
                    <button type="button" className="hv-btn hv-btn--primary" disabled={saving}
                        onClick={() => onApprove(note)}>Duyệt & chuyển nghỉ việc</button>
                </footer>
            </section>
        </div>
    );
};

// ===== Trang =====

export default function HandoverPage({ reviewMode = false, admin = false }) {
    const isReview = reviewMode || admin;
    const { language } = useLanguage();
    const locale = localeForLanguage(language);

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({ lastWorkingDate: today(), reason: "", assets: initialAssets(language), projects: initialProjects(language) });

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await axiosClient.get(`/EmployeeHandover/${isReview ? "get-all" : "mine"}`);
            setRows(dataOf(response) || []);
        } catch (e) {
            setError(e.response?.data?.message || e.response?.data || e.message || "Không tải được yêu cầu bàn giao.");
        } finally {
            setLoading(false);
        }
    }, [isReview]);

    useEffect(() => { load(); }, [load]);

    const submit = async (event) => {
        event?.preventDefault?.();
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const body = new FormData();
            body.append("LastWorkingDate", form.lastWorkingDate);
            body.append("Reason", form.reason);
            body.append("AssetsJson", JSON.stringify(form.assets.map(({ assetType, assetCode, condition, note }) => ({ assetType, assetCode, condition, note }))));
            body.append("ProjectsJson", JSON.stringify(form.projects.map(({ projectCode, projectName, partner, progress }) => ({ projectCode, projectName, partner, progress, documents: [], handoverFiles: [] }))));
            const metadata = [];
            form.projects.forEach((project, projectIndex) => ["documents", "handoverFiles"].forEach((kind) => (project[kind] || []).forEach((file) => {
                body.append("Attachments", file);
                metadata.push({ projectIndex, kind });
            })));
            body.append("AttachmentMetadataJson", JSON.stringify(metadata));
            // Quan trọng: bỏ đè default "Content-Type: application/json" của axiosClient
            // để trình duyệt tự đặt "multipart/form-data; boundary=..." (server bind [FromForm]).
            await axiosClient.post("/EmployeeHandover/request", body, { headers: { "Content-Type": undefined } });
            setForm({ lastWorkingDate: today(), reason: "", assets: initialAssets(language), projects: initialProjects(language) });
            setNotice("Đã gửi yêu cầu bàn giao cho cấp trên.");
            await load();
        } catch (e) {
            setError(e.response?.data?.message || e.response?.data || e.message || "Không gửi được yêu cầu bàn giao.");
        } finally {
            setSaving(false);
        }
    };

    const download = async (handoverId, file) => {
        try {
            const response = await axiosClient.get(`/EmployeeHandover/${handoverId}/files/${encodeURIComponent(file.storedName)}`, { responseType: "blob" });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement("a");
            link.href = url;
            link.download = file.fileName;
            link.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            setError(e.response?.data?.message || "Không tải được tệp bàn giao.");
        }
    };

    const review = async (approve, note) => {
        if (!selected) return;
        setSaving(true);
        setError("");
        setNotice("");
        try {
            await axiosClient.post(`/EmployeeHandover/review/${selected.id}`, { approve, note });
            setNotice(approve ? "Đã duyệt bàn giao. Nhân viên đã được chuyển sang danh sách nghỉ việc." : "Đã từ chối yêu cầu bàn giao.");
            setSelected(null);
            await load();
        } catch (e) {
            setError(e.response?.data?.message || e.response?.data || e.message || "Không xử lý được yêu cầu.");
        } finally {
            setSaving(false);
        }
    };

    const pendingCount = rows.filter((r) => r.status === 0).length;

    const content = (
        <div className="hv-page">
            {/* Header */}
            {isReview && <HrHero
                ico="📦"
                title="Bàn giao nghỉ việc"
                sub="Xem, xử lý và duyệt yêu cầu bàn giao của nhân viên nghỉ việc."
                kpis={[
                    { ico: "📋", label: "Tổng yêu cầu", value: rows.length, tone: "blue" },
                    { ico: "⏳", label: "Chờ xử lý", value: rows.filter((r) => r.status === 0).length, tone: "warn" },
                    { ico: "✅", label: "Đã duyệt", value: rows.filter((r) => r.status === 1).length, tone: "green" },
                    { ico: "✕", label: "Từ chối", value: rows.filter((r) => r.status === 2).length, tone: "red" },
                ]}
            />}

            {notice && <div className="hv-alert hv-alert--ok">{notice}</div>}
            {error && <div className="hv-alert hv-alert--error">{String(error)}</div>}

            {/* Form tạo yêu cầu (chỉ nhân viên, khi chưa có yêu cầu đang chờ) */}
            {!isReview && !rows.some((row) => row.status === 0) && (
                <section className="hv-panel">
                    <HandoverForm form={form} setForm={setForm} submitting={saving} onSubmit={submit} locale={locale} />
                </section>
            )}
            {!isReview && rows.some((row) => row.status === 0) && (
                <section className="hv-panel hv-panel--waiting">
                    <div className="hv-waiting">
                        <span className="hv-waiting-ico">⏳</span>
                        <div>
                            <strong>Đang chờ cấp trên duyệt</strong>
                            <p className="hv-muted">Bạn có yêu cầu bàn giao đang chờ xử lý. Form tạo mới sẽ mở lại sau khi yêu cầu đó được duyệt hoặc từ chối.</p>
                        </div>
                    </div>
                </section>
            )}

            {/* Lịch sử / danh sách xử lý */}
            <section className="hv-panel">
                <div className="hv-list-head">
                    <h2>{isReview ? "Yêu cầu bàn giao cần xử lý" : "Lịch sử yêu cầu của tôi"}</h2>
                    <button type="button" className="hv-btn hv-btn--ghost" onClick={load} disabled={loading}>↻ Làm mới</button>
                </div>
                {loading ? (
                    <div className="hv-empty">Đang tải...</div>
                ) : rows.length === 0 ? (
                    <div className="hv-empty">
                        <span className="hv-empty-ico">📋</span>
                        <p>{isReview ? "Chưa có yêu cầu bàn giao nào." : "Bạn chưa gửi yêu cầu bàn giao nào."}</p>
                    </div>
                ) : (
                    <div className="hv-list">
                        {rows.map((row) => (
                            <HandoverCard
                                key={row.id}
                                row={row}
                                locale={locale}
                                reviewMode={isReview}
                                onDownload={download}
                                onReview={setSelected}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Dialog duyệt */}
            {selected && (
                <ReviewDialog
                    selected={selected}
                    locale={locale}
                    saving={saving}
                    onDownload={download}
                    onApprove={(note) => review(true, note)}
                    onReject={(note) => review(false, note)}
                    onClose={() => setSelected(null)}
                />
            )}
        </div>
    );

    if (admin) return <HrAppLayout>{content}</HrAppLayout>;
    if (reviewMode) return <HrAppLayout>{content}</HrAppLayout>;
    return <AppLayout>{content}</AppLayout>;
}
