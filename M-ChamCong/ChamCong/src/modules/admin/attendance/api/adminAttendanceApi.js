import axiosClient from "../../../../services/api/axiosClient";

// API quản trị chấm công (role Admin): toàn bộ nhân viên + thêm/sửa/xóa bản ghi
// + duyệt công + log chấm công (để tính KPI bất thường).
const adminAttendanceApi = {
    attendanceAll(page = 1, size = 1000) {
        return axiosClient.get(
            `/Attendance/get-all?pageNumber=${page}&pageSize=${size}`
        );
    },
    employeesAll(page = 1, size = 500) {
        return axiosClient.get(
            `/Employee/get-all?pageNumber=${page}&pageSize=${size}`
        );
    },
    create(payload) {
        return axiosClient.post("/Attendance/create", payload);
    },
    update(payload) {
        return axiosClient.put("/Attendance/update", payload);
    },
    softDelete(id) {
        return axiosClient.delete(`/Attendance/soft-delete/${id}`);
    },
    // Duyệt / từ chối công (approvedBy = nhân viên admin đang duyệt)
    approve(payload) {
        return axiosClient.post("/Attendance/approve", payload);
    },
    logsAll(page = 1, size = 2000) {
        return axiosClient.get(
            `/AttendanceLog/get-all?pageNumber=${page}&pageSize=${size}`
        );
    },
};

export default adminAttendanceApi;
