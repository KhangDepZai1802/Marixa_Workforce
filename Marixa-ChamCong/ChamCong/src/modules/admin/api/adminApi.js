import axiosClient from "../../../services/api/axiosClient";

// API cấp công ty (admin) - dùng get-all với pageSize lớn, tính phía client.
const P = "pageNumber=1&pageSize=500";

const adminApi = {
    employees() {
        return axiosClient.get(`/Employee/get-all?${P}`);
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
    updateLeave(payload) {
        return axiosClient.put("/LeaveRequest/update", payload);
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
    createInsurance(payload) {
        return axiosClient.post("/EmployeeInsurance/create", payload);
    },
    createBankAccount(payload) {
        return axiosClient.post("/EmployeeBankAccount/create", payload);
    },
    blockUser(userId, payload) {
        return axiosClient.post(`/User/${userId}/block`, payload);
    },
    unblockUser(userId) {
        return axiosClient.post(`/User/${userId}/unblock`);
    },
    // === Phân quyền (Roles / gán role cho user) ===
    roles() {
        return axiosClient.get(`/Role/get-all?${P}`);
    },
    createRole(payload) {
        return axiosClient.post("/Role/create", payload);
    },
    updateRole(payload) {
        return axiosClient.put("/Role/update", payload);
    },
    deleteRole(id) {
        return axiosClient.delete(`/Role/soft-delete/${id}`);
    },
    userRoles(userId) {
        return axiosClient.get(`/UserRole/get-roles/${userId}`);
    },
    addRoleToUser(userId, roleId) {
        return axiosClient.post(`/UserRole/add-role?UserId=${userId}&RoleId=${roleId}`);
    },
    removeRoleFromUser(userId, roleId) {
        return axiosClient.delete(`/UserRole/remove-role?UserId=${userId}&RoleId=${roleId}`);
    },
    // === GIAO VIỆC + THEO DÕI + KÉO-THẢ + COMMENT (WorkTask) ===
    myWorkTasks() {
        return axiosClient.get("/WorkTask/mine");
    },
    assignedWorkTasks() {
        return axiosClient.get("/WorkTask/assigned");
    },
    allWorkTasks() {
        return axiosClient.get("/WorkTask/get-all");
    },
    workTask(id) {
        return axiosClient.get(`/WorkTask/${id}`);
    },
    createWorkTask(payload) {
        return axiosClient.post("/WorkTask/create", payload);
    },
    assignableEmployees() {
        return axiosClient.get("/WorkTask/assignable");
    },
    moveWorkTask(id, payload) {
        return axiosClient.put(`/WorkTask/${id}/move`, payload);
    },
    deleteWorkTask(id) {
        return axiosClient.delete(`/WorkTask/${id}`);
    },
    workTaskComments(id) {
        return axiosClient.get(`/WorkTask/${id}/comments`);
    },
    addWorkTaskComment(id, payload) {
        return axiosClient.post(`/WorkTask/${id}/comments`, payload);
    },
    // === ĐÁNH GIÁ HIỆU SUẤT (WorkPerformance) ===
    myWorkPerformance() {
        return axiosClient.get("/WorkPerformance/mine");
    },
    allWorkPerformance() {
        return axiosClient.get("/WorkPerformance/get-all");
    },
    workPerformance(id) {
        return axiosClient.get(`/WorkPerformance/${id}`);
    },
    createWorkPerformance(payload) {
        return axiosClient.post("/WorkPerformance/create", payload);
    },
    confirmWorkPerformance(id, payload) {
        return axiosClient.post(`/WorkPerformance/${id}/confirm`, payload);
    },
    // === DỰ ÁN / GÓI CÔNG VIỆC (WorkProject) ===
    workProjects() {
        return axiosClient.get("/WorkProject/mine");
    },
    workProjectsAll() {
        return axiosClient.get("/WorkProject/get-all");
    },
    selectableEmployees() {
        return axiosClient.get("/WorkProject/subordinates");
    },
    createWorkProject(formData) {
        return axiosClient.post("/WorkProject/create", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },
    };

export default adminApi;
