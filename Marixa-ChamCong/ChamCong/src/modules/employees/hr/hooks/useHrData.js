import { useState, useEffect, useCallback } from "react";
import employeeApi from "../../api/employeeApi";

const items = (r) =>
    r?.status === "fulfilled" ? r.value.data.data?.items || [] : [];

// Kéo dữ liệu HR (không còn logs chấm công - đã bỏ KPI chấm công).
export const useHrData = () => {
    const [data, setData] = useState({
        employees: [],
        archivedEmployees: [],
        contracts: [],
        departments: [],
        positions: [],
        salaries: [],
        insurance: [],
        bankAccounts: [],
        activationCodes: [],
        users: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setError("");
        try {
            const r = await Promise.allSettled([
                employeeApi.employees(),
                employeeApi.archivedEmployees(),
                employeeApi.contracts(),
                employeeApi.departments(),
                employeeApi.positions(),
                employeeApi.salaries(),
                employeeApi.insurance(),
                employeeApi.bankAccounts(),
                employeeApi.activationCodes(),
                employeeApi.users(),
            ]);
            setData({
                employees: items(r[0]),
                archivedEmployees: items(r[1]).map((employee) => ({ ...employee, status: 4, isArchived: true })),
                contracts: items(r[2]),
                departments: items(r[3]),
                positions: items(r[4]),
                salaries: items(r[5]),
                insurance: items(r[6]),
                bankAccounts: items(r[7]),
                activationCodes: items(r[8]),
                users: items(r[9]),
            });
        } catch (e) {
            setError(
                e.response?.data?.message ||
                    e.message ||
                    "Không thể tải dữ liệu nhân sự."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return { ...data, loading, error, reload: load };
};
