import { Fragment, useState } from "react";

import HrAppLayout from "../layout/HrAppLayout";
import employeeApi from "../../api/employeeApi";
import { useHrData } from "../hooks/useHrData";
import { HR_QUICK_FILTERS, useHrFilters } from "../hooks/useHrFilters";
import HrFilterBar from "../components/HrFilterBar";
import HrHero from "../HrHero";
import HrEmployeeTable from "../components/HrEmployeeTable";
import HrPagination from "../components/HrPagination";
import HrAddForm from "../components/HrAddForm";
import { downloadExcel, hrTemplate, exportEmployees, HR_HEADER_BY_KEY, parseCsv, readExcel } from "../hrUtils";
import "../../../../modules/me/attendance.css";
import "../hr.css";
import { localeForLanguage, translate, useLanguage } from "../../../../services/i18n/LanguageProvider";

const formatImportError = (error) => {
    const body = error.response?.data;
    if (typeof body?.message === "string") return [body.message];
    const validation = body?.errors || body?.data?.errors;
    if (validation && typeof validation === "object") {
        return Object.entries(validation).flatMap(([key, messages]) =>
            (Array.isArray(messages) ? messages : [messages]).map((message) =>
                `${HR_HEADER_BY_KEY[key] || key}: ${String(message)}`
            )
        );
    }
    return [error.message || "API từ chối dữ liệu."];
};

const PAGE_SIZE = 20;
let activeLocale = "vi-VN";
const formatDate = (value) => value ? new Date(value).toLocaleDateString(activeLocale) : "—";
const formatMoney = (value) => value != null && value !== "" ? `${Number(value).toLocaleString(activeLocale)} ₫` : "—";

const HrPage = () => {
    const data = useHrData();
    const { filters, setters, filtered, hasActiveFilter, quickFilter } = useHrFilters([...data.employees, ...data.archivedEmployees], data);
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(() => new Set());
    const [showForm, setShowForm] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [viewEmp, setViewEmp] = useState(null);
    const [importReport, setImportReport] = useState(null);
    const { language } = useLanguage();
    const L = (text) => translate(text, language);
    activeLocale = localeForLanguage(language);

    const relatedFor = (employeeId) => {
        const newest = (items, dateKey) => items
            .filter((item) => item.employeeId === employeeId)
            .sort((a, b) => new Date(b[dateKey] || b.createdTime || 0) - new Date(a[dateKey] || a.createdTime || 0))[0] || null;
        return {
            contract: newest(data.contracts, "startDate"),
            salary: newest(data.salaries, "effectiveFrom"),
            insurance: newest(data.insurance, "createdTime"),
            bankAccount: data.bankAccounts.find((item) => item.employeeId === employeeId && item.isPrimary)
                || data.bankAccounts.find((item) => item.employeeId === employeeId)
                || null,
        };
    };

    const list = filtered;

    const pageCount = Math.ceil(list.length / PAGE_SIZE);
    const safePage = Math.min(page, Math.max(1, pageCount));
    const slice = list.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const toggle = (id) =>
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    const toggleAll = (uncheck) =>
        setSelected(
            uncheck ? new Set() : new Set(slice.map((e) => e.id))
        );

    const archiveEmployee = async (employee) => {
        if (!window.confirm(`${L("Lưu trữ")} ${employee.fullName} ${L("và chuyển hồ sơ sang danh sách Đã nghỉ việc?")}`)) return;
        try {
            await employeeApi.softDeleteEmployee(employee.id);
            await data.reload();
            setters.setQuickFilter("resigned");
        } catch (error) {
            window.alert(error.response?.data?.message || error.message || L("Không thể lưu trữ nhân viên."));
        }
    };

    const restoreEmployee = async (employee) => {
        if (!window.confirm(`${L("Khôi phục hồ sơ")} ${employee.fullName} ${L("về danh sách nhân viên?")}`)) return;
        try {
            await employeeApi.restoreEmployee(employee.id);
            await data.reload();
            setters.setQuickFilter("all");
        } catch (error) {
            window.alert(error.response?.data?.message || error.message || L("Không thể khôi phục nhân viên."));
        }
    };

    // ===== Excel / CSV (nhập / xuất / mẫu) =====
    const onTemplate = () => downloadExcel("mau-nhan-vien.xlsx", hrTemplate());
    const onExport = () => downloadExcel("danh-sach-nhan-vien.xlsx", exportEmployees(list, data));
    const onImportFile = async (file) => {
        if (!file) return;
        const extension = file.name.split(".").pop().toLowerCase();
        if (!["csv", "xlsx"].includes(extension)) {
            setImportReport({ created: 0, skipped: 0, errors: 1, warnings: 0, rows: [{ row: "—", code: "", status: L("Không đọc được"), details: ["Vui lòng chọn file .xlsx hoặc .csv."] }] });
            return;
        }
        try {
            const rows = extension === "xlsx"
                ? await readExcel(file)
                : parseCsv(await file.text());
            if (rows.length < 2) {
                setImportReport({ created: 0, skipped: 0, errors: 1, warnings: 0, rows: [{ row: "—", code: "", status: L("Không đọc được"), details: ["File rỗng hoặc thiếu dòng dữ liệu."] }] });
                return;
            }
            const headers = rows[0].map((h) => h.trim().toLowerCase());
            const requiredHeaders = ["EmployeeCode", "GivenName", "FamilyName"];
            const absentHeaders = requiredHeaders.filter((key) => {
                const candidates = [HR_HEADER_BY_KEY[key], key].map((x) => x.toLowerCase());
                return !headers.some((header) => candidates.includes(header));
            });
            if (absentHeaders.length) {
                setImportReport({
                    created: 0, skipped: 0, errors: 1, warnings: 0,
                    rows: [{ row: 1, code: "", status: L("Thiếu cột"), details: absentHeaders.map((key) => `Thiếu cột “${HR_HEADER_BY_KEY[key]}”.`) }],
                });
                return;
            }

            let created = 0;
            let skipped = 0;
            let errors = 0;
            let warnings = 0;
            const reportRows = [];
            const normalizeCode = (value) => String(value || "").trim().toUpperCase();
            const normalizePhone = (value) => {
                const digits = String(value || "").replace(/\D/g, "");
                if (digits.startsWith("0084")) return `0${digits.slice(4)}`;
                if (digits.length === 11 && digits.startsWith("84")) return `0${digits.slice(2)}`;
                return digits;
            };
            const normalizeCitizenId = (value) => String(value || "").replace(/[\s.-]/g, "").toUpperCase();
            const findId = (value, items) => {
                if (!value) return null;
                const match = items.find((item) =>
                    String(item.id).toLowerCase() === value.toLowerCase() ||
                    item.name?.trim().toLowerCase() === value.toLowerCase()
                );
                return match?.id || null;
            };
            const existingBy = { code: new Map(), phone: new Map(), citizenId: new Map() };
            const addToIndex = (employee) => {
                const name = employee.employeeCode || employee.fullName || "đã tồn tại";
                const keys = [
                    ["code", normalizeCode(employee.employeeCode)],
                    ["phone", normalizePhone(employee.phoneNumber)],
                    ["citizenId", normalizeCitizenId(employee.citizenId || employee.citizenIdNumber)],
                ];
                keys.forEach(([field, key]) => { if (key) existingBy[field].set(key, name); });
            };
            data.employees.forEach(addToIndex);

            for (let i = 1; i < rows.length; i++) {
                const rowNumber = i + 1;
                const get = (k) => {
                    const labels = [HR_HEADER_BY_KEY[k], k].filter(Boolean).map((value) => value.toLowerCase());
                    const idx = headers.findIndex((header) => labels.includes(header));
                    return idx >= 0 ? String(rows[i][idx] ?? "").trim() : "";
                };
                const code = get("EmployeeCode");
                const given = get("GivenName");
                const family = get("FamilyName");
                const details = [];
                const duplicateFields = [
                    ["code", code, "Mã nhân viên"],
                    ["phone", get("PhoneNumber"), "Số điện thoại"],
                    ["citizenId", get("CitizenId"), "CCCD / CMT"],
                ];
                const duplicateReasons = duplicateFields.flatMap(([field, value, label]) => {
                    const key = field === "code" ? normalizeCode(value) : field === "phone" ? normalizePhone(value) : normalizeCitizenId(value);
                    const existing = key && existingBy[field].get(key);
                    return existing ? [`${label} đã có trong hệ thống (${existing}).`] : [];
                });

                const required = [[code, "Mã nhân viên"], [given, "Họ / tên đệm"], [family, "Tên"]];
                required.forEach(([value, label]) => { if (!value) details.push(`Chưa điền ${label}.`); });
                const maxLengths = [[code, 50, "Mã nhân viên"], [given, 100, "Họ / tên đệm"], [family, 100, "Tên"], [get("PhoneNumber"), 20, "Số điện thoại"], [get("CitizenId"), 20, "CCCD / CMT"], [get("Email"), 150, "Email"]];
                maxLengths.forEach(([value, max, label]) => { if (value.length > max) details.push(`${label} vượt quá ${max} ký tự.`); });
                if (get("Email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(get("Email"))) details.push("Email không đúng định dạng.");

                const parseDate = (key) => {
                    const value = get(key);
                    if (!value) return null;
                    let match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
                    if (!match) {
                        const local = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
                        if (local) match = [local[0], local[3], local[2], local[1]];
                    }
                    const label = HR_HEADER_BY_KEY[key];
                    if (!match) { details.push(`${label} không đúng định dạng ngày (dùng YYYY-MM-DD hoặc DD/MM/YYYY).`); return null; }
                    const iso = `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
                    const date = new Date(`${iso}T00:00:00Z`);
                    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) { details.push(`${label} không phải ngày hợp lệ.`); return null; }
                    return iso;
                };
                const dates = Object.fromEntries(["BirthDate", "CitizenIdIssuedDate", "StartDate", "ProbationEndDate", "ContractStart", "ContractEnd"].map((key) => [key, parseDate(key)]));
                const enumLabels = {
                    Gender: { "không tiết lộ": 0, nam: 1, nữ: 2, nu: 2 },
                    LaborType: { "chính thức": 1, "bán thời gian": 2, "thực tập sinh": 3, "cộng tác viên": 4 },
                    Status: { "thử việc": 1, "đang làm": 2, "tạm nghỉ": 3, "đã nghỉ việc": 4, "chấm dứt hợp đồng": 5, "chấm dứt hđ": 5 },
                    ContractType: { "thử việc": 1, "hạn định": 2, "không xác định": 3, "mùa vụ": 4 },
                    PaymentType: { "theo tháng": 1, tháng: 1, ngày: 2, giờ: 3, "theo sản phẩm": 4, "sản phẩm": 4 },
                };
                const readEnum = (key, fallback, max) => {
                    const value = get(key);
                    if (!value) return fallback;
                    const label = HR_HEADER_BY_KEY[key];
                    const mapped = enumLabels[key][value.toLowerCase()];
                    const parsed = mapped ?? Number(value);
                    if (!Number.isInteger(parsed) || parsed < 0 || parsed > max || (key !== "Gender" && parsed === 0)) {
                        details.push(`${label} không hợp lệ. Giá trị được phép: ${Object.keys(enumLabels[key]).join(", " )} hoặc mã từ ${key === "Gender" ? 0 : 1} đến ${max}.`);
                        return fallback;
                    }
                    return parsed;
                };
                const gender = readEnum("Gender", 0, 2);
                const laborType = readEnum("LaborType", 1, 4);
                const status = readEnum("Status", 1, 5);
                const contractType = readEnum("ContractType", 1, 4);
                const paymentType = readEnum("PaymentType", 1, 4);
                const readBoolean = (key) => {
                    const value = get(key).toLowerCase();
                    if (!value || ["false", "0", "no", "không", "khong"].includes(value)) return false;
                    if (["true", "1", "yes", "có", "co", "x"].includes(value)) return true;
                    details.push(`${HR_HEADER_BY_KEY[key]} chỉ nhận Có hoặc Không.`);
                    return false;
                };
                const usePhoneAttendance = readBoolean("UsePhoneAttendance");
                const isSocialInsuranceParticipant = readBoolean("IsSocialInsuranceParticipant");
                const readMoney = (key) => {
                    const value = get(key);
                    if (!value) return 0;
                    const parsed = Number(value.replace(/[\s,.]/g, ""));
                    if (!Number.isFinite(parsed) || parsed < 0) details.push(`${HR_HEADER_BY_KEY[key]} phải là số không âm.`);
                    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
                };
                const basicSalary = readMoney("BasicSalary");
                const positionAllowance = readMoney("PositionAllowance");
                const otherAllowance = readMoney("OtherAllowance");
                const departmentId = get("DepartmentName") ? findId(get("DepartmentName"), data.departments) : null;
                const positionId = get("PositionName") ? findId(get("PositionName"), data.positions) : null;
                const bankId = get("BankName") ? findId(get("BankName"), data.banks || []) : null;
                if (get("DepartmentName") && !departmentId) details.push(`Phòng ban “${get("DepartmentName")}” không có trong danh mục.`);
                if (get("PositionName") && !positionId) details.push(`Chức vụ “${get("PositionName")}” không có trong danh mục.`);
                if (get("BankName") && !bankId) details.push(`Ngân hàng “${get("BankName")}” không có trong danh mục.`);
                if (!!get("BankName") !== !!get("AccountNumber")) details.push("Cần điền cả Ngân hàng và Số tài khoản.");
                if (get("ContractNumber") && !dates.ContractStart && !dates.StartDate) details.push("Có Số hợp đồng nhưng thiếu Ngày ký hợp đồng hoặc Ngày vào làm.");

                if (duplicateReasons.length || details.length) {
                    if (duplicateReasons.length) skipped++;
                    else errors++;
                    reportRows.push({ row: rowNumber, code, status: duplicateReasons.length ? L("Đã tồn tại — bỏ qua") : L("Cần chỉnh sửa"), details: [...duplicateReasons, ...details] });
                    continue;
                }

                try {
                    const response = await employeeApi.createEmployee({
                        employeeCode: code,
                        givenName: given,
                        familyName: family,
                        birthDate: dates.BirthDate,
                        gender,
                        citizenId: get("CitizenId") || null,
                        citizenIdIssuedDate: dates.CitizenIdIssuedDate,
                        citizenIdIssuedPlace: get("CitizenIdIssuedPlace") || null,
                        email: get("Email") || null,
                        phoneNumber: get("PhoneNumber") || null,
                        permanentAddress: get("PermanentAddress") || null,
                        currentAddress: get("CurrentAddress") || null,
                        departmentId,
                        positionId,
                        startDate: dates.StartDate,
                        probationEndDate: dates.ProbationEndDate,
                        laborType,
                        status,
                        usePhoneAttendance,
                        note: get("Note") || null,
                    });
                    created++;
                    const employee = { employeeCode: code, phoneNumber: get("PhoneNumber"), citizenId: get("CitizenId") };
                    addToIndex(employee);
                    const resultData = response.data?.data;
                    let employeeId = resultData?.id || response.data?.id ||
                        (typeof resultData === "string" && /^[\da-f-]{36}$/i.test(resultData) ? resultData : null);
                    if (!employeeId) {
                        try {
                            const refresh = await employeeApi.employees();
                            const employees = refresh.data?.data?.items || refresh.data?.data || [];
                            employeeId = employees.find((item) => normalizeCode(item.employeeCode) === normalizeCode(code))?.id || null;
                        } catch {
                            // The create request already succeeded; optional details are reported below.
                        }
                    }
                    const warningsForRow = [];
                    if (!employeeId) {
                        const hasRelatedInfo = get("ContractNumber") ||
                            ["BasicSalary", "PositionAllowance", "OtherAllowance"].some((key) => get(key)) ||
                            get("SocialInsuranceNumber") || get("PersonalTaxCode") || isSocialInsuranceParticipant ||
                            get("AccountNumber");
                        if (hasRelatedInfo) warningsForRow.push("Đã thêm nhân viên, nhưng không lấy được mã hồ sơ để lưu hợp đồng/lương/bảo hiểm/tài khoản.");
                        if (get("EndWorkDate") || get("EndWorkReason")) warningsForRow.push("API hiện chưa lưu Ngày/Lý do kết thúc làm việc.");
                        if (warningsForRow.length) {
                            warnings++;
                            reportRows.push({ row: rowNumber, code, status: L("Đã thêm, cần kiểm tra"), details: warningsForRow });
                        } else reportRows.push({ row: rowNumber, code, status: L("Đã thêm thành công"), details: [] });
                        continue;
                    }
                    const relatedRequests = [];
                    const contractNumber = get("ContractNumber");
                    const contractStart = dates.ContractStart || dates.StartDate;
                    if (contractNumber && contractStart) {
                        relatedRequests.push(["Hợp đồng", employeeApi.createContract({
                            employeeId,
                            contractNumber,
                            contractType,
                            startDate: contractStart,
                            endDate: dates.ContractEnd,
                        })]);
                    }
                    if (["BasicSalary", "PositionAllowance", "OtherAllowance"].some((key) => get(key))) {
                        relatedRequests.push(["Lương", employeeApi.createSalary({
                            employeeId,
                            paymentType,
                            basicSalary,
                            positionAllowance,
                            otherAllowance,
                            effectiveFrom: dates.StartDate || new Date().toISOString().slice(0, 10),
                        })]);
                    }
                    if (get("SocialInsuranceNumber") || get("PersonalTaxCode") || isSocialInsuranceParticipant) {
                        relatedRequests.push(["Bảo hiểm", employeeApi.createInsurance({
                            employeeId,
                            socialInsuranceNumber: get("SocialInsuranceNumber") || null,
                            personalTaxCode: get("PersonalTaxCode") || null,
                            isSocialInsuranceParticipant,
                        })]);
                    }
                    if (bankId && get("AccountNumber")) {
                        relatedRequests.push(["Tài khoản ngân hàng", employeeApi.createBankAccount({
                            employeeId,
                            bankId,
                            accountNumber: get("AccountNumber"),
                            isPrimary: true,
                        })]);
                    }
                    const relatedResults = await Promise.allSettled(relatedRequests.map(([, request]) => request));
                    warningsForRow.push(...relatedResults.flatMap((result, idx) => result.status === "rejected"
                        ? [`Không lưu được ${relatedRequests[idx][0]}: ${formatImportError(result.reason).join(" ")}`]
                        : []));
                    if (get("EndWorkDate") || get("EndWorkReason")) warningsForRow.push("API hiện chưa lưu Ngày/Lý do kết thúc làm việc.");
                    if (warningsForRow.length) {
                        warnings++;
                        reportRows.push({ row: rowNumber, code, status: L("Đã thêm, cần kiểm tra"), details: warningsForRow });
                    } else reportRows.push({ row: rowNumber, code, status: L("Đã thêm thành công"), details: [] });
                } catch (error) {
                    errors++;
                    reportRows.push({ row: rowNumber, code, status: L("Không thêm được"), details: formatImportError(error) });
                }
            }
            await data.reload();
            setImportReport({ created, skipped, errors, warnings, rows: reportRows });
        } catch (error) {
            setImportReport({ created: 0, skipped: 0, errors: 1, warnings: 0, rows: [{ row: "—", code: "", status: L("Không đọc được"), details: [error.message] }] });
        }
    };

    return (
        <HrAppLayout>
            {data.error && <div className="att-error">{data.error}</div>}
            {data.loading && <div className="att-loading">{L("Đang tải...")}</div>}

                {!data.loading && !data.error && (
                    <div className="hr-body">
                        <HrHero
                            ico="👥"
                            title="Nhân sự"
                            sub="Quản lý hồ sơ, danh sách và trạng thái nhân viên toàn công ty."
                            kpis={[
                                { ico: "👥", label: "Tổng nhân viên", value: data.employees.length + data.archivedEmployees.length, tone: "blue" },
                                { ico: "✅", label: "Đang làm", value: data.employees.filter((e) => e.status === 2).length, tone: "green" },
                                { ico: "📋", label: "Thử việc", value: data.employees.filter((e) => e.status === 1).length, tone: "gray" },
                                { ico: "⚠", label: "Sắp hết HĐ", value: (() => {
                                    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 30);
                                    return data.contracts.filter((c) => c.endDate && new Date(c.endDate) >= new Date() && new Date(c.endDate) <= cutoff).length;
                                })(), tone: "warn" },
                            ]}
                        />
                        <HrFilterBar
                            departments={data.departments}
                            positions={data.positions}
                            filters={filters}
                            setters={setters}
                            hasActiveFilter={hasActiveFilter}
                            onAdd={() => { setEditingEmployee(null); setShowForm(true); }}
                            onImportFile={onImportFile}
                            onExport={onExport}
                            onTemplate={onTemplate}
                            showActions
                        />

                        <div className="hr-quick-filters" aria-label="Lọc nhanh nhân viên">
                            {HR_QUICK_FILTERS.map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    className={`hr-quick-filter${quickFilter === key ? " active" : ""}`}
                                    aria-pressed={quickFilter === key}
                                    onClick={() => setters.setQuickFilter(key)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <HrEmployeeTable
                            employees={slice}
                            selected={selected}
                            onToggle={toggle}
                            onToggleAll={toggleAll}
                            data={{
                                contracts: data.contracts,
                                salaries: data.salaries,
                                insurance: data.insurance,
                                bankAccounts: data.bankAccounts,
                            }}
                            onView={setViewEmp}
                            onEdit={(e) => { setViewEmp(null); setEditingEmployee(e); setShowForm(true); }}
                            onArchive={archiveEmployee}
                            onRestore={restoreEmployee}
                            quickFilter={quickFilter}
                        />

                        <HrPagination
                            page={safePage}
                            pageCount={pageCount}
                            totalItems={list.length}
                            onPrev={() => setPage((p) => Math.max(1, p - 1))}
                            onNext={() =>
                                setPage((p) => Math.min(pageCount, p + 1))
                            }
                            onPage={setPage}
                        />

                        {showForm && (
                            <HrAddForm
                                departments={data.departments}
                                positions={data.positions}
                                banks={data.banks || []}
                                employee={editingEmployee}
                                related={editingEmployee ? relatedFor(editingEmployee.id) : {}}
                                onSaved={() => {
                                    setShowForm(false);
                                    setEditingEmployee(null);
                                    data.reload();
                                }}
                                onCancel={() => { setShowForm(false); setEditingEmployee(null); }}
                            />
                        )}

                        {viewEmp && (
                            <div
                                className="hr-view-modal"
                                onClick={() => setViewEmp(null)}
                            >
                                <div className="hr-view-box" onClick={(e) => e.stopPropagation()}>
                                    <h3>{viewEmp.fullName} <small>· {viewEmp.employeeCode}</small></h3>
                                    {(() => {
                                        const { contract, salary, insurance, bankAccount } = relatedFor(viewEmp.id);
                                        const sections = [
                                            { title: L("1. Danh tính"), rows: [["Mã nhân viên", viewEmp.employeeCode], ["Họ và tên", viewEmp.fullName], ["Ngày sinh", formatDate(viewEmp.birthDate)], ["Giới tính", ({ 1: "Nam", 2: "Nữ" })[viewEmp.gender] || "Không tiết lộ"]] },
                                            { title: L("2. Giấy tờ pháp lý"), rows: [["CCCD / CMT", viewEmp.citizenId], ["Ngày cấp", formatDate(viewEmp.citizenIdIssuedDate)], ["Nơi cấp", viewEmp.citizenIdIssuedPlace]] },
                                            { title: L("3. Địa chỉ liên hệ"), rows: [["Điện thoại", viewEmp.phoneNumber], ["Email", viewEmp.email], ["Địa chỉ thường trú", viewEmp.permanentAddress], ["Địa chỉ hiện tại", viewEmp.currentAddress]] },
                                            { title: L("4. Điều kiện làm việc"), rows: [["Phòng ban", viewEmp.departmentName], ["Chức vụ", viewEmp.positionName], ["Ngày vào làm", formatDate(viewEmp.startDate)], ["Kết thúc thử việc", formatDate(viewEmp.probationEndDate)], ["Loại lao động", ({ 1: "Chính thức", 2: "Bán thời gian", 3: "Thực tập sinh", 4: "Cộng tác viên" })[viewEmp.laborType]], ["Trạng thái", ({ 1: "Thử việc", 2: "Đang làm", 3: "Tạm nghỉ", 4: "Đã nghỉ việc", 5: "Chấm dứt hợp đồng" })[viewEmp.status]], ["Chấm công qua điện thoại", viewEmp.usePhoneAttendance ? "Có" : "Không"]] },
                                            { title: L("5. Hợp đồng"), rows: [["Số hợp đồng", contract?.contractNumber], ["Loại hợp đồng", ({ 1: "Thử việc", 2: "Có thời hạn", 3: "Không xác định thời hạn", 4: "Mùa vụ" })[contract?.contractType]], ["Ngày ký / bắt đầu", formatDate(contract?.startDate)], ["Ngày hết hạn", formatDate(contract?.endDate)], ["Ghi chú hợp đồng", contract?.note]] },
                                            { title: L("6. Lương & chế độ"), rows: [["Hình thức trả lương", ({ 1: "Theo tháng", 2: "Theo ngày", 3: "Theo giờ", 4: "Theo sản phẩm" })[salary?.paymentType]], ["Lương cơ bản", formatMoney(salary?.basicSalary)], ["Lương theo ngày", formatMoney(salary?.dailyRate)], ["Phụ cấp chức vụ", formatMoney(salary?.positionAllowance)], ["Phụ cấp khác", formatMoney(salary?.otherAllowance)], ["Thưởng", formatMoney(salary?.bonus)], ["Lương đóng BHXH", formatMoney(salary?.socialInsuranceSalary)], ["Hiệu lực từ", formatDate(salary?.effectiveFrom)], ["Hiệu lực đến", formatDate(salary?.effectiveTo)]] },
                                            { title: L("7. Bảo hiểm & thuế"), rows: [["Số BHXH", insurance?.socialInsuranceNumber], ["Số bảo hiểm y tế (BHYT)", insurance?.healthInsuranceNumber], ["Mã số thuế cá nhân", insurance?.personalTaxCode], ["Tham gia BHXH", insurance ? (insurance.isSocialInsuranceParticipant ? "Có" : "Không") : null], ["Ngày bắt đầu tham gia", formatDate(insurance?.participationStartDate)], ["Ngày kết thúc tham gia", formatDate(insurance?.participationEndDate)], ["Mức lương đóng BHXH", formatMoney(insurance?.socialInsuranceSalary)], ["Trạng thái bảo hiểm", ({ 1: "Đang tham gia", 2: "Tạm dừng", 3: "Đã chốt sổ" })[insurance?.status]]] },
                                            { title: L("8. Thanh toán"), rows: [["Ngân hàng", bankAccount?.bankName], ["Số tài khoản", bankAccount?.accountNumber], ["Chủ tài khoản", bankAccount?.accountHolderName], ["Tài khoản chính", bankAccount ? (bankAccount.isPrimary ? "Có" : "Không") : null], ["Trạng thái tài khoản", bankAccount ? (bankAccount.status === 1 ? "Đang dùng" : "Đã ngưng") : null]] },
                                            { title: L("Ghi chú"), rows: [["Ghi chú nhân viên", viewEmp.note]] },
                                        ];
                                        return sections.map((section) => (
                                            <section className="hr-view-section" key={section.title}>
                                                <h4>{section.title}</h4>
                                                <dl className="hr-view-grid">
                                                    {section.rows.map(([label, value]) => <Fragment key={label}><span>{label}</span><dd>{value == null || value === "" ? "—" : value}</dd></Fragment>)}
                                                </dl>
                                            </section>
                                        ));
                                    })()}
                                    <div className="hr-view-actions">
                                        <button type="button" className="hr-btn hr-btn--ghost" onClick={() => setViewEmp(null)}>{L("Đóng")}</button>
                                        <button type="button" className="hr-btn hr-btn--primary" onClick={() => { setEditingEmployee(viewEmp); setViewEmp(null); setShowForm(true); }}>{L("Sửa hồ sơ")}</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {importReport && (
                            <div className="hr-view-modal" onClick={() => setImportReport(null)}>
                                <section className="hr-import-report" role="dialog" aria-modal="true" aria-labelledby="hr-import-report-title" onClick={(event) => event.stopPropagation()}>
                                    <header className="hr-import-report-head">
                                        <h3 id="hr-import-report-title">{L("Kết quả nhập nhân viên")}</h3>
                                        <button type="button" aria-label={L("Đóng")} onClick={() => setImportReport(null)}>×</button>
                                    </header>
                                    <p className="hr-import-summary">
                                        Đã thêm <strong>{importReport.created}</strong> · Bỏ qua do trùng <strong>{importReport.skipped}</strong> · Lỗi <strong>{importReport.errors}</strong> · Cảnh báo <strong>{importReport.warnings}</strong>
                                    </p>
                                    {importReport.rows.length ? (
                                        <div className="hr-import-report-table-wrap">
                                            <table className="hr-import-report-table">
                                                <thead><tr><th>Dòng</th><th>Mã nhân viên</th><th>Kết quả</th><th>Chi tiết cần xử lý</th></tr></thead>
                                                <tbody>{importReport.rows.map((item, index) => (
                                                    <tr key={`${item.row}-${item.code}-${index}`} className={item.status.startsWith("Đã thêm") ? "hr-import-row--created" : ""}>
                                                        <td>{item.row}</td><td>{item.code || "—"}</td><td>{item.status}</td>
                                                        <td>{item.details.map((detail, detailIndex) => <div key={detailIndex}>{detail}</div>)}</td>
                                                    </tr>
                                                ))}</tbody>
                                            </table>
                                        </div>
                                    ) : <p className="hr-import-empty">{L("Tất cả dòng hợp lệ đã được nhập.")}</p>}
                                    <div className="hr-import-report-actions">
                                        <button type="button" className="hr-btn hr-btn--primary" onClick={() => setImportReport(null)}>{L("Đóng")}</button>
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>
                )}

        </HrAppLayout>
    );
};

export default HrPage;
