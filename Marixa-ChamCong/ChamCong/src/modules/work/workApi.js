import axiosClient from "../../services/api/axiosClient";

// Dữ liệu "việc của tôi" cho khu Công việc (tất cả là của người dùng hiện tại).
const workApi = {
    // Báo cáo của mình (mảng trực tiếp).
    myReports() {
        return axiosClient.get("/EmployeeReport/mine");
    },
    // Nghỉ phép của mình (mảng trực tiếp).
    myLeaves(employeeId) {
        return axiosClient.get(`/LeaveRequest/by-employee/${employeeId}`);
    },
    // Tải file báo cáo (bản chính / đính kèm).
    downloadReport(versionId) {
        return axiosClient.get(`/EmployeeReport/download/${versionId}`, { responseType: "blob" });
    },
    downloadAttachment(id) {
        return axiosClient.get(`/EmployeeReport/download-attachment/${id}`, { responseType: "blob" });
    },
};

export default workApi;
