import { useMemo, useState } from "react";
import { formatVnDate } from "../../../../utils/vnTime";
import employeeAttendanceApi from "../api/employeeAttendanceApi";

// Modal xem chi tiết các bản ghi employeeShifts (gán ca) + thông tin ca
// (Shifts) của một nhân viên: ngày bắt đầu, ngày kết thúc, tên ca, giờ làm, ghi chú.
// Nút "Sửa" (chỉ hiện khi canEdit, backend PUT /EmployeeShift/update chỉ dành cho Admin):
// form sửa xếp dọc 3 hàng: (1) ngày bắt đầu + ngày kết thúc, (2) ca + giờ làm, (3) ghi chú.
// Đổi giờ làm sẽ cập nhật cả ca (PUT /Shift/update) -> áp dụng cho mọi NV dùng ca đó.
const toInputDate = (value) => (value || "").slice(0, 10);
const toInputTime = (value) => (value ? String(value).slice(0, 5) : "");
const padTimeSeconds = (value) => (value ? `${value}:00` : "");

const EmployeeShiftDetailModal = ({ employee, assignments, shifts, onClose, canEdit, onUpdated }) => {
    const [editingId, setEditingId] = useState(null);
    const [draft, setDraft] = useState({
        effectiveFrom: "",
        effectiveTo: "",
        shiftId: "",
        startTime: "",
        endTime: "",
        note: "",
    });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [saveNotice, setSaveNotice] = useState("");

    const shiftById = useMemo(() => new Map(shifts.map((shift) => [shift.id, shift])), [shifts]);

    // Toàn bộ bản ghi gán ca của nhân viên này (kể cả ca đã tắt, để xem lịch sử).
    const rows = useMemo(
        () =>
            (assignments || [])
                .filter((assignment) => assignment.employeeId === employee.id && !assignment.deletedTime)
                .map((assignment) => ({
                    ...assignment,
                    shift: shiftById.get(assignment.shiftId) || null,
                }))
                .sort((a, b) => new Date(a.effectiveFrom) - new Date(b.effectiveFrom)),
        [assignments, employee.id, shiftById]
    );

    const fmtDay = (value) => (value ? formatVnDate(value) : "—");
    const fmtTime = (value) => (value ? String(value).slice(0, 5) : "—");

    const setDraftField = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

    const startEdit = (row) => {
        setSaveError("");
        setSaveNotice("");
        setDraft({
            effectiveFrom: toInputDate(row.effectiveFrom),
            effectiveTo: toInputDate(row.effectiveTo),
            shiftId: row.shiftId,
            startTime: toInputTime(row.shift?.startTime),
            endTime: toInputTime(row.shift?.endTime),
            note: row.note || "",
        });
        setEditingId(row.id);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setDraft({ effectiveFrom: "", effectiveTo: "", shiftId: "", startTime: "", endTime: "", note: "" });
        setSaveError("");
    };

    // Đổi ca -> lấy giờ làm mặc định của ca mới.
    const onShiftChange = (value) => {
        const nextShift = shiftById.get(value);
        setDraft((current) => ({
            ...current,
            shiftId: value,
            startTime: toInputTime(nextShift?.startTime),
            endTime: toInputTime(nextShift?.endTime),
        }));
    };

    const saveEdit = async (row) => {
        if (!draft.effectiveFrom) {
            setSaveError("Ngày bắt đầu không được để trống.");
            return;
        }
        if (draft.effectiveTo && draft.effectiveTo < draft.effectiveFrom) {
            setSaveError("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.");
            return;
        }
        if (!draft.shiftId) {
            setSaveError("Vui lòng chọn ca làm.");
            return;
        }
        if (!draft.startTime || !draft.endTime) {
            setSaveError("Giờ làm (bắt đầu / kết thúc) không được để trống.");
            return;
        }
        setSaving(true);
        setSaveError("");
        try {
            // 1) Cập nhật bản ghi gán ca (ca + khoảng ngày + ghi chú)
            await employeeAttendanceApi.updateEmployeeShifts({
                id: row.id,
                employeeId: row.employeeId,
                shiftId: draft.shiftId,
                effectiveFrom: draft.effectiveFrom,
                effectiveTo: draft.effectiveTo || null,
                note: draft.note.trim() || null,
            });
            // 2) Nếu giờ làm thay đổi -> cập nhật cả ca (ảnh hưởng mọi NV dùng ca đó)
            const targetShift = shiftById.get(draft.shiftId);
            const timesChanged = targetShift
                ? toInputTime(targetShift.startTime) !== draft.startTime || toInputTime(targetShift.endTime) !== draft.endTime
                : false;
            if (targetShift && timesChanged) {
                await employeeAttendanceApi.updateShift({
                    ...targetShift,
                    id: targetShift.id,
                    code: targetShift.code,
                    name: targetShift.name,
                    description: targetShift.description ?? null,
                    startTime: padTimeSeconds(draft.startTime),
                    endTime: padTimeSeconds(draft.endTime),
                    standardHours: targetShift.standardHours,
                    breakMinutes: targetShift.breakMinutes,
                    isNight: targetShift.isNight,
                    workDays: targetShift.workDays,
                    isActive: targetShift.isActive,
                });
            }
            setSaveNotice("Đã lưu thay đổi.");
            cancelEdit();
            if (onUpdated) onUpdated();
        } catch (err) {
            const body = err.response?.data;
            setSaveError(body?.data?.errorMessage || body?.message || err.message || "Không thể lưu thay đổi.");
        } finally {
            setSaving(false);
        }
    };

    const editingRow = editingId ? rows.find((row) => row.id === editingId) : null;
    const colCount = canEdit ? 6 : 5;

    return (
        <div className="att-guide-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <section className="att-detail-modal shift-detail-modal" role="dialog" aria-modal="true" aria-label="Chi tiết ca làm việc">
                <header className="att-detail-modal-head">
                    <div>
                        <h2>Chi tiết ca làm việc</h2>
                        <p>
                            {employee.fullName} ({employee.employeeCode}) · {rows.length} bản ghi gán ca
                        </p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Đóng">×</button>
                </header>

                {rows.length === 0 ? (
                    <p className="att-muted">Nhân viên này chưa được gán ca làm việc nào.</p>
                ) : (
                    <div className="att-table-wrap">
                        <table className="att-table att-table--compact att-table--shift-detail">
                            <thead>
                                <tr>
                                    <th>Ngày bắt đầu</th>
                                    <th>Ngày kết thúc</th>
                                    <th>Ca</th>
                                    <th>Giờ làm</th>
                                    <th>Ghi chú</th>
                                    {canEdit && <th className="att-col-actions">Thao tác</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => {
                                    const isEditing = editingId === row.id;
                                    if (isEditing && canEdit) {
                                        return (
                                            <tr key={row.id} className="is-editing">
                                                <td colSpan={colCount}>
                                                    <div className="shift-detail-edit-form">
                                                        <label className="shift-detail-field">
                                                            <span>Ngày bắt đầu</span>
                                                            <input
                                                                type="date"
                                                                value={draft.effectiveFrom}
                                                                onChange={(event) => setDraftField("effectiveFrom", event.target.value)}
                                                            />
                                                        </label>
                                                        <label className="shift-detail-field">
                                                            <span>Ngày kết thúc (để trống = mở)</span>
                                                            <input
                                                                type="date"
                                                                min={draft.effectiveFrom}
                                                                value={draft.effectiveTo}
                                                                onChange={(event) => setDraftField("effectiveTo", event.target.value)}
                                                            />
                                                        </label>
                                                        <label className="shift-detail-field">
                                                            <span>Ca làm</span>
                                                            <select value={draft.shiftId} onChange={(event) => onShiftChange(event.target.value)}>
                                                                <option value="">Chọn ca</option>
                                                                {shifts.map((shift) => (
                                                                    <option key={shift.id} value={shift.id}>
                                                                        {shift.name} · {fmtTime(shift.startTime)}–{fmtTime(shift.endTime)}
                                                                        {!shift.isActive ? " (ca đã tắt)" : ""}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </label>
                                                        <div className="shift-detail-field shift-detail-field--times">
                                                            <span>Giờ làm</span>
                                                            <div className="shift-detail-edit-row-times">
                                                                <input
                                                                    type="time"
                                                                    aria-label="Giờ bắt đầu"
                                                                    value={draft.startTime}
                                                                    onChange={(event) => setDraftField("startTime", event.target.value)}
                                                                />
                                                                <span aria-hidden="true">–</span>
                                                                <input
                                                                    type="time"
                                                                    aria-label="Giờ kết thúc"
                                                                    value={draft.endTime}
                                                                    onChange={(event) => setDraftField("endTime", event.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                        <label className="shift-detail-field shift-detail-edit-note">
                                                            <span>Ghi chú (không bắt buộc)</span>
                                                            <input
                                                                type="text"
                                                                maxLength={500}
                                                                placeholder="Ví dụ: lịch làm tháng 10"
                                                                value={draft.note}
                                                                onChange={(event) => setDraftField("note", event.target.value)}
                                                            />
                                                        </label>
                                                        <p className="shift-detail-edit-hint">
                                                            Đổi giờ làm sẽ áp dụng cho ca này với mọi nhân viên khác dùng cùng ca.
                                                        </p>
                                                        <div className="shift-detail-edit-actions">
                                                            <button
                                                                type="button"
                                                                className="admin-link-btn admin-link-btn--sm"
                                                                disabled={saving}
                                                                onClick={cancelEdit}
                                                            >
                                                                Hủy
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="shift-detail-save-btn"
                                                                disabled={saving}
                                                                onClick={() => saveEdit(row)}
                                                            >
                                                                {saving ? "Đang lưu..." : "Lưu"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }
                                    return (
                                        <tr key={row.id}>
                                            <td>{fmtDay(row.effectiveFrom)}</td>
                                            <td>
                                                {row.effectiveTo ? fmtDay(row.effectiveTo) : <span className="att-muted">Mở</span>}
                                            </td>
                                            <td>
                                                {row.shift ? (
                                                    <>
                                                        <strong>{row.shift.name}</strong>
                                                        {!row.shift.isActive && (
                                                            <span className="att-badge warn"> (ca đã tắt)</span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="att-muted">Ca không tồn tại</span>
                                                )}
                                            </td>
                                            <td>
                                                {row.shift
                                                    ? `${fmtTime(row.shift.startTime)}–${fmtTime(row.shift.endTime)}`
                                                    : "—"}
                                            </td>
                                            <td>{row.note ? <span title={row.note}>{row.note}</span> : "—"}</td>
                                            {canEdit && (
                                                <td className="att-col-actions">
                                                    <button type="button" className="admin-link-btn admin-link-btn--sm" onClick={() => startEdit(row)}>
                                                        Sửa
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {saveError && <div className="att-error" role="alert">{saveError}</div>}
                {saveNotice && !editingRow && <div className="shift-detail-save-note" role="status">{saveNotice}</div>}

                <footer>
                    <button type="button" className="admin-link-btn" onClick={onClose}>Đóng</button>
                </footer>
            </section>
        </div>
    );
};

export default EmployeeShiftDetailModal;
