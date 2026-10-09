import { useMemo, useState } from "react";
import { docCompleteness } from "../hrUtils";

// Trạng thái nhân viên (đồng bộ EmployeeStatus enum).
export const STATUS_LABELS = {
    1: "Thử việc",
    2: "Đang làm",
    3: "Nghỉ phép",
    4: "Đã nghỉ việc",
    5: "Chấm dứt",
};
export const STATUS_TONES = {
    1: "info",
    2: "ok",
    3: "warn",
    4: "muted",
    5: "bad",
};

// Lọc phía client: tìm kiếm (tên/mã/email) + phòng ban + chức vụ + trạng thái.
export const HR_QUICK_FILTERS = [
    ["all", "Tất cả"],
    ["working", "Đang làm việc"],
    ["probation", "Thử việc"],
    ["expiring", "Sắp hết hợp đồng"],
    ["incomplete", "Thiếu hồ sơ"],
    ["verification", "Chờ xác minh"],
    ["payroll", "Chưa đủ để tính lương"],
    ["insurance", "Chưa đủ để khai BHXH"],
    ["no-account", "Chưa có tài khoản"],
    ["no-contract", "Chưa có hợp đồng"],
    ["resigned", "Đã nghỉ việc"],
    ["real", "Chỉ hồ sơ thật"],
];

const activeCode = (code) => !code.isUsed && new Date(code.expiresAt) > new Date();

export const useHrFilters = (employees, data) => {
    const [search, setSearch] = useState("");
    const [department, setDepartment] = useState("");
    const [position, setPosition] = useState("");
    const [quickFilter, setQuickFilter] = useState("all");

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return employees.filter((e) => {
            if (q) {
                const name = (e.fullName || "").toLowerCase();
                const code = (e.employeeCode || "").toLowerCase();
                const email = (e.email || "").toLowerCase();
                const hit =
                    name.includes(q) || code.includes(q) || email.includes(q);
                if (!hit) return false;
            }
            if (department && e.departmentId !== department) return false;
            if (position && e.positionId !== position) return false;
            if (quickFilter === "resigned") {
                if (![4, 5].includes(e.status) && !e.isArchived) return false;
            } else if (e.isArchived && !["all", "real"].includes(quickFilter)) {
                return false;
            }
            const contracts = data.contracts.filter((item) => item.employeeId === e.id);
                        const hasAccount = Boolean(e.userId || data.users.some((user) => user.employeeId === e.id));
            const hasContract = contracts.length > 0;
            const missing = docCompleteness(e, data).missing;
            if ([1, 2, 3].includes(e.status) && quickFilter !== "resigned") {
                if (quickFilter === "working" && e.status !== 2) return false;
                if (quickFilter === "probation" && e.status !== 1) return false;
                if (quickFilter === "expiring") {
                    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 30);
                    if (!contracts.some((item) => item.endDate && new Date(item.endDate) >= new Date() && new Date(item.endDate) <= cutoff)) return false;
                }
                if (quickFilter === "incomplete" && missing.length === 0) return false;
                if (quickFilter === "verification" && !data.activationCodes.some((code) => code.employeeId === e.id && activeCode(code))) return false;
                if (quickFilter === "payroll" && !missing.some((key) => ["lương&chế độ", "thanh toán"].includes(key))) return false;
                if (quickFilter === "insurance" && !missing.includes("bảo hiểm&thue")) return false;
                if (quickFilter === "no-account" && hasAccount) return false;
                if (quickFilter === "no-contract" && hasContract) return false;
                if (quickFilter === "real" && (e.isDemo || e.isSample || /^(demo|test|fake)[-_]/i.test(e.employeeCode || ""))) return false;
            } else if (quickFilter !== "all" && quickFilter !== "resigned" && quickFilter !== "real") {
                return false;
            }
            return true;
        });
    }, [employees, search, department, position, quickFilter, data]);

    const reset = () => {
        setSearch("");
        setDepartment("");
        setPosition("");
        setQuickFilter("all");
    };

    return {
        filters: { search, department, position },
        setters: {
            setSearch,
            setDepartment,
            setPosition,
            setQuickFilter,
            reset,
        },
        quickFilter,
        filtered,
        hasActiveFilter: !!search || !!department || !!position || quickFilter !== "all",
    };
};
