import { useState, useEffect } from "react";

// Kéo danh sách từ một API get-all (Promise) -> { items, loading, error, reload }.
export const useEmployeeList = (fetcher) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const reload = async () => {
        try {
            const r = await fetcher();
            setRows(r.data.data?.items || []);
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        reload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { rows, loading, error, reload };
};
