import axiosClient from "../../../../services/api/axiosClient";

// API quản trị chấm công (role Admin): toàn bộ nhân viên + thêm/sửa/xóa bản ghi
// + duyệt công + log chấm công (để tính KPI bất thường).
const employeeAttendanceApi = {
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
    employeeShiftsAll(page = 1, size = 1000) {
        return axiosClient.get(`/EmployeeShift/get-all?pageNumber=${page}&pageSize=${size}`);
    },
    createEmployeeShifts(payload) {
        return axiosClient.post("/EmployeeShift/create-bulk", payload);
    },
    // Sửa 1 bản ghi gán ca: { id, employeeId, shiftId, effectiveFrom, effectiveTo?, note? }
    updateEmployeeShifts(payload) {
        return axiosClient.put("/EmployeeShift/update", payload);
    },
    shiftsAll(page = 1, size = 500) {
        return axiosClient.get(`/Shift/get-all?pageNumber=${page}&pageSize=${size}`);
    },
    // Sửa thông tin ca (giờ làm, tên...): payload là object Shift đầy đủ + id
    updateShift(payload) {
        return axiosClient.put("/Shift/update", payload);
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

export default employeeAttendanceApi;
