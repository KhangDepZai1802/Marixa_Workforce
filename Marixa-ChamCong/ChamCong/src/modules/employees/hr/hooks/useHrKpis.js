import { useMemo } from "react";

// Nhân viên đang hoạt động (thử việc / đang làm / tạm nghỉ).
export const activeEmployees = (employees) =>
    employees.filter((e) => [1, 2, 3].includes(e.status));

// ===== KPI nhân sự (đã bỏ 2 KPI chấm công) =====
export const useHrKpis = (data) => {
    const { employees, contracts, salaries } = data;

    return useMemo(() => {
        const active = activeEmployees(employees);

        // Hợp đồng: NV đang làm chưa có hợp đồng / chưa nhập ngày hết hạn.
        const withContract = new Set(
            contracts.filter((c) => c.endDate).map((c) => c.employeeId)
        );
        const noContractEnd = active.filter((e) => !withContract.has(e.id))
            .length;

        // Hồ sơ đủ tính lương: NV đang làm đã có bảng lương.
        const withSalary = new Set(salaries.map((s) => s.employeeId));
        const missingSalary = active.filter((e) => !withSalary.has(e.id))
            .length;

        return {
            activeCount: active.length,
            noContractEnd,
            missingSalary,
            readyForPayroll: active.length - missingSalary,
        };
    }, [employees, contracts, salaries]);
};
