import { useEffect, useState } from "react";
import workApi from "./workApi";
import { getAuth } from "../../services/auth/auth";

// Dữ liệu "Công việc" của người dùng hiện tại: báo cáo + nghỉ phép.
// Trạng thái (camelCase): report 0=chờ,1=duyệt,3=yêu cầu sửa,6=cấp trên bổ sung,7=hoàn tất.
const STATUS = {
    0: { label: "Chờ duyệt", tone: "warn" },
    1: { label: "Đã duyệt", tone: "ok" },
    2: { label: "Từ chối", tone: "bad" },
    3: { label: "Yêu cầu sửa", tone: "bad" },
    4: { label: "Đã gửi cấp trên", tone: "info" },
    5: { label: "Cấp trên duyệt", tone: "ok" },
    6: { label: "Cấp trên yêu cầu bổ sung", tone: "bad" },
    7: { label: "Hoàn tất", tone: "ok" },
};

export const useWorkData = () => {
    const [reports, setReports] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const auth = getAuth();

    useEffect(() => {
        let alive = true;
        const jobs = [workApi.myReports().then((r) => setReports(r.data.data || []))];
        if (auth?.employeeId) jobs.push(workApi.myLeaves(auth.employeeId).then((r) => setLeaves(r.data.data || [])).catch(() => {}));
        Promise.allSettled(jobs)
            .then(() => { if (alive) { setLoading(false); } })
            .catch(() => { if (alive) { setError("Không tải được dữ liệu công việc."); setLoading(false); } });
        return () => { alive = false; };
    }, [auth?.employeeId]);

    return { reports, leaves, loading, error, STATUS };
};

export default useWorkData;
