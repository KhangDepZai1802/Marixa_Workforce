import axiosClient from "../../../services/api/axiosClient";

// API cấp công ty (admin) - dùng get-all với pageSize lớn, tính phía client.
const P = "pageNumber=1&pageSize=500";

const employeeApi = {
    employees() {
        return axiosClient.get(`/Employee/get-all?${P}`);
    },
    archivedEmployees() {
        return axiosClient.get(`/Employee/get-archived?${P}`);
    },
    restoreEmployee(id) {
        return axiosClient.post(`/Employee/restore/${id}`);
    },
    attendanceLogs() {
        return axiosClient.get(
            `/AttendanceLog/get-all?pageNumber=1&pageSize=2000`
        );
    },
    leaveRequests() {
        return axiosClient.get(`/LeaveRequest/get-all?${P}`);
    },
    payrolls() {
        return axiosClient.get(`/Payroll/get-all?${P}`);
    },
    contracts() {
        return axiosClient.get(`/EmployeeContract/get-all?${P}`);
    },
    activationCodes() {
        return axiosClient.get(`/ActivationCode/get-all?${P}`);
    },
    users() {
        return axiosClient.get(`/User/get-all?${P}`);
    },
    // Thêm: dữ liệu cần cho bộ lọc + KPI
    departments() {
        return axiosClient.get(`/Department/get-all?${P}`);
    },
    positions() {
        return axiosClient.get(`/Position/get-all?${P}`);
    },
    insurance() {
        return axiosClient.get(`/EmployeeInsurance/get-all?${P}`);
    },
    bankAccounts() {
        return axiosClient.get(`/EmployeeBankAccount/get-all?${P}`);
    },
    salaries() {
        return axiosClient.get(`/EmployeeSalary/get-all?${P}`);
    },
    banks() {
        return axiosClient.get(`/Bank/get-all?${P}`);
    },
    createActivationCode(payload) {
        return axiosClient.post("/Auth/create-activation-code", payload);
    },
    verifyEmployeeActivation(payload) {
        return axiosClient.post("/Auth/verify-employee-activation", payload);
    },
    // === Quản trị: chấm công / hợp đồng / nghỉ phép / tài khoản ===
    attendances() {
        return axiosClient.get(`/Attendance/get-all?${P}`);
    },
    employeeReports(params = {}) {
        return axiosClient.get("/EmployeeReport/get-all", { params });
    },
    reviewEmployeeReport(id, payload) {
        return axiosClient.post(`/EmployeeReport/review/${id}`, payload);
    },
    forwardEmployeeReport(id, payload) {
        return axiosClient.post(`/EmployeeReport/forward/${id}`, payload);
    },
    upperDecision(id, payload) {
        return axiosClient.post(`/EmployeeReport/upper-decision/${id}`, payload);
    },
    respondToUpperRequest(id, payload) {
        return axiosClient.post(`/EmployeeReport/respond/${id}`, payload);
    },
    completeEmployeeReport(id) {
        return axiosClient.post(`/EmployeeReport/complete/${id}`);
    },
    reportViewed(id) {
        return axiosClient.post(`/EmployeeReport/viewed/${id}`);
    },
    uploadReportToUpper(id, formData) {
        return axiosClient.post(`/EmployeeReport/upper/${id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
    },
    markReportSent(id) {
        return axiosClient.post(`/EmployeeReport/mark-sent/${id}`);
    },
    downloadEmployeeReport(versionId) {
        return axiosClient.get(`/EmployeeReport/download/${versionId}`, { responseType: "blob" });
    },
    downloadReportAttachment(id) {
        return axiosClient.get(`/EmployeeReport/download-attachment/${id}`, { responseType: "blob" });
    },
    downloadUpperReport(id) {
        return axiosClient.get(`/EmployeeReport/upper-download/${id}`, { responseType: "blob" });
    },
    approveAttendance(payload) {
        return axiosClient.post("/Attendance/approve", payload);
    },
    createContract(payload) {
        return axiosClient.post("/EmployeeContract/create", payload);
    },
    updateContract(payload) {
        return axiosClient.put("/EmployeeContract/update", payload);
    },
    updateLeave(payload) {
        return axiosClient.put("/LeaveRequest/update", payload);
    },
    approveLeave(id, note = "") {
        return axiosClient.post(`/LeaveRequest/approve/${id}`, { note });
    },
    rejectLeave(id, note = "") {
        return axiosClient.post(`/LeaveRequest/reject/${id}`, { note });
    },
    cancelLeave(id, reason = "") {
        return axiosClient.post(`/LeaveRequest/cancel/${id}`, { reason });
    },
    updatePayroll(payload) {
        return axiosClient.put("/Payroll/update", payload);
    },
    createUser(payload) {
        return axiosClient.post("/User/create", payload);
    },
    createEmployee(payload) {
        return axiosClient.post("/Employee/create", payload);
    },
    updateEmployee(payload) {
        return axiosClient.put("/Employee/update", payload);
    },
    softDeleteEmployee(id) {
        return axiosClient.delete(`/Employee/soft-delete/${id}`);
    },
    createSalary(payload) {
        return axiosClient.post("/EmployeeSalary/create", payload);
    },
    updateSalary(payload) {
        return axiosClient.put("/EmployeeSalary/update", payload);
    },
    createInsurance(payload) {
        return axiosClient.post("/EmployeeInsurance/create", payload);
    },
    updateInsurance(payload) {
        return axiosClient.put("/EmployeeInsurance/update", payload);
    },
    createBankAccount(payload) {
        return axiosClient.post("/EmployeeBankAccount/create", payload);
    },
    updateBankAccount(payload) {
        return axiosClient.put("/EmployeeBankAccount/update", payload);
    },
};

export default employeeApi;
