import { useState, useEffect } from "react";

// Modal thêm / sửa bản ghi chấm công (admin).
// row = null -> thêm mới; row có giá trị -> sửa.
const STATUS_OPTIONS = [
    { v: "", l: "Chưa đánh giá" },
    { v: 1, l: "Đúng giờ" },
    { v: 2, l: "Đi trễ" },
    { v: 3, l: "Về sớm" },
    { v: 4, l: "Vắng mặt" },
    { v: 5, l: "Nghỉ phép" },
    { v: 6, l: "Lễ" },
    { v: 7, l: "Ngoại tuần" },
];

const APPROVAL_OPTIONS = [
    { v: 0, l: "Chờ duyệt" },
    { v: 1, l: "Đã duyệt" },
    { v: 2, l: "Từ chối" },
];

const normalizeEmployeeSearch = (value) =>
    String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/gi, "d")
        .toLocaleLowerCase("vi-VN");

const buildDraft = (row) =>
    row
        ? {
              employeeId: row.employeeId,
              attendanceDate: (row.attendanceDate || "").slice(0, 10),
              status: row.status ?? "",
              actualHours: row.actualHours ?? "",
              approvalStatus: row.approvalStatus ?? 0,
              note: row.note || "",
          }
        : {
              employeeId: "",
              attendanceDate: new Date().toISOString().slice(0, 10),
              status: "",
              actualHours: "",
              approvalStatus: 0,
              note: "",
          };

const AttendanceFormModal = ({ open, row, employees, onClose, onSubmit }) => {
    const [form, setForm] = useState(null);
    const [error, setError] = useState("");
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [showEmployeeOptions, setShowEmployeeOptions] = useState(false);

    // Nạp form mỗi lần mở (thêm: trống, sửa: từ row)
    useEffect(() => {
        if (open) {
            setForm(buildDraft(row));
            setError("");
            const selected = employees.find((employee) => employee.id === row?.employeeId);
            setEmployeeSearch(selected ? `${selected.fullName} · ${selected.employeeCode}` : "");
            setShowEmployeeOptions(false);
        }
    }, [open, row, employees]);

    if (!open || !form) return null;

    const set = (k) => (e) =>
        setForm({ ...form, [k]: e.target.value });

    const searchTerm = normalizeEmployeeSearch(employeeSearch.trim());
    const employeeOptions = searchTerm
        ? employees
              .filter((employee) => normalizeEmployeeSearch(`${employee.fullName} ${employee.employeeCode}`).includes(searchTerm))
              .slice(0, 8)
        : [];

    const submit = async (e) => {
        e.preventDefault();
        if (!form.employeeId || !form.attendanceDate) {
            setError("Chọn nhân viên và ngày là bắt buộc.");
            return;
        }
        if ([1, 2].includes(Number(form.approvalStatus)) && !form.status) {
            setError("Vui lòng chọn Trạng thái trước khi duyệt hoặc từ chối.");
            return;
        }
        if (Number(form.approvalStatus) === 2 && !form.note.trim()) {
            setError("Vui lòng nhập lý do từ chối.");
            return;
        }
        setError("");
        try {
            await onSubmit(form, !!row);
            setForm(null);
        } catch {
            // giữ form để người dùng sửa lỗi
        }
    };

    return (
        <div className="att-guide-overlay">
            <div className="att-form-modal" onClick={(e) => e.stopPropagation()}>
                <h2>{row?._approvalDecision ? (row.approvalStatus === 1 ? "Duyệt bản ghi chấm công" : "Từ chối bản ghi chấm công") : row ? "Sửa bản ghi chấm công" : "Thêm bản ghi chấm công"}</h2>
                <form onSubmit={submit} className="att-form">
                    <label>
                        Nhân viên
                        <div className="att-employee-picker" onBlur={(event) => {
                            if (!event.currentTarget.contains(event.relatedTarget)) setShowEmployeeOptions(false);
                        }}>
                            <input
                                required
                                role="combobox"
                                aria-autocomplete="list"
                                aria-expanded={showEmployeeOptions && employeeOptions.length > 0}
                                aria-controls="att-employee-options"
                                value={employeeSearch}
                                placeholder="Nhập họ tên hoặc mã nhân viên..."
                                onFocus={() => setShowEmployeeOptions(true)}
                                onChange={(event) => {
                                    setEmployeeSearch(event.target.value);
                                    setShowEmployeeOptions(true);
                                    setForm({ ...form, employeeId: "" });
                                }}
                            />
                            {showEmployeeOptions && employeeOptions.length > 0 && (
                                <div className="att-employee-options" id="att-employee-options" role="listbox">
                                    {employeeOptions.map((employee) => (
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={form.employeeId === employee.id}
                                            key={employee.id}
                                            onClick={() => {
                                                setForm({ ...form, employeeId: employee.id });
                                                setEmployeeSearch(`${employee.fullName} · ${employee.employeeCode}`);
                                                setShowEmployeeOptions(false);
                                            }}
                                        >
                                            <strong>{employee.fullName}</strong>
                                            <span>{employee.employeeCode}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {showEmployeeOptions && searchTerm && employeeOptions.length === 0 && (
                                <div className="att-employee-empty">Không tìm thấy nhân viên phù hợp.</div>
                            )}
                        </div>
                    </label>

                    <label>
                        Ngày
                        <input
                            type="date"
                            required
                            value={form.attendanceDate}
                            onChange={set("attendanceDate")}
                        />
                    </label>

                    <label>
                        Trạng thái{[1, 2].includes(Number(form.approvalStatus)) ? " *" : ""}
                        <select required={[1, 2].includes(Number(form.approvalStatus))} value={form.status} onChange={set("status")}>
                            {STATUS_OPTIONS.map((o) => (
                                <option key={o.l} value={o.v}>
                                    {o.l}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Giờ thực tế
                        <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={form.actualHours}
                            onChange={set("actualHours")}
                            placeholder="Tùy chọn"
                        />
                    </label>

                    <label>
                        Phê duyệt
                        <select
                            value={form.approvalStatus}
                            onChange={set("approvalStatus")}
                        >
                            {APPROVAL_OPTIONS.map((o) => (
                                <option key={o.v} value={o.v}>
                                    {o.l}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        {Number(form.approvalStatus) === 2 ? "Lý do từ chối *" : "Ghi chú"}
                        <textarea
                            rows="2"
                            required={Number(form.approvalStatus) === 2}
                            value={form.note}
                            onChange={set("note")}
                            placeholder={Number(form.approvalStatus) === 2 ? "Nhập lý do từ chối" : "Tùy chọn"}
                        />
                    </label>

                    {error && <p className="att-cam-error">{error}</p>}

                    <div className="att-form-actions">
                        <button
                            type="button"
                            className="att-cam-btn-remove"
                            onClick={onClose}
                        >
                            Hủy
                        </button>
                        <button type="submit" className="admin-link-btn">
                            {row?._approvalDecision ? (row.approvalStatus === 1 ? "Xác nhận duyệt" : "Xác nhận từ chối") : row ? "Lưu sửa" : "Thêm mới"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AttendanceFormModal;
