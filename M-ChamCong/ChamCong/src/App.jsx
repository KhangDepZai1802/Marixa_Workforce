import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./modules/login/pages/LoginPage";
import ActivatePage from "./modules/activate/pages/ActivatePage";
import HrPage from "./modules/employees/hr/pages/HrPage";
import ReportsPage from "./modules/employees/hr/pages/ReportsPage";
import WorkPage from "./modules/work/WorkPage";
import ProfilePage from "./modules/profile/pages/ProfilePage";
import AdminHomepage from "./modules/admin/pages/AdminHomepage";
import AdminAttendanceHistoryPage from "./modules/admin/attendance/pages/AdminAttendanceHistoryPage";
import AdminStatisticsPage from "./modules/admin/attendance/pages/AdminStatisticsPage";
import AdminContractPage from "./modules/admin/contracts/pages/AdminContractPage";
import AdminWorkPage from "./modules/admin/work/AdminWorkPage";
import AdminBlockAccountPage from "./modules/admin/block-account/AdminBlockAccountPage";
import AdminRolesPage from "./modules/admin/roles/AdminRolesPage";
import AdminLeaveAdminPage from "./modules/admin/leaves/pages/LeaveAdminPage";
import {
    PayrollAdminPage,
    ResignedPage as AdminResignedPage,
} from "./modules/admin/leaves/pages/PayrollResignedReport";
import AdminAccountIssuancePage from "./modules/admin/accounts/pages/AccountIssuancePage";
import EmployeeAttendanceHistoryPage from "./modules/employees/attendance/pages/EmployeeAttendanceHistoryPage";
import EmployeeWorkSchedulePage from "./modules/employees/attendance/pages/EmployeeWorkSchedulePage";
import EmployeeStatisticsPage from "./modules/employees/attendance/pages/EmployeeStatisticsPage";
import EmployeeLeavePage from "./modules/employees/leaves/pages/EmployeeLeavePage";
import EmployeeAccountIssuancePage from "./modules/employees/accounts/pages/AccountIssuancePage";
import EmployeeContractPage from "./modules/employees/contracts/pages/EmployeeContractPage";
import HomePage from "./modules/home/pages/HomePage";
import UnauthorizedPage from "./modules/unauthorized/pages/UnauthorizedPage";
import RequireModule from "./components/common/RequireModule";
import PromotionsPage from "./modules/employees/hr/pages/PromotionsPage";

// ===== Module "me": các trang nhân viên xem thông tin của mình =====
import MeClockInPage from "./modules/me/pages/ClockInPage";
import MeHistoryPage from "./modules/me/pages/HistoryPage";
import MeRulesPage from "./modules/me/pages/RulesPage";
import MeStatisticsPage from "./modules/me/pages/StatisticsPage";
import MeLeavePage from "./modules/me/pages/LeavePage";
import MeReportsPage from "./modules/me/pages/ReportsPage";
import MePromotionsPage from "./modules/me/pages/PromotionsPage";
import MeHandoverPage from "./modules/me/pages/HandoverPage";
import MeContractPage from "./modules/me/pages/ContractPage";
import MeSalaryPage from "./modules/me/pages/SalaryPage";
import MeInsurancePage from "./modules/me/pages/InsurancePage";
import MeBankPage from "./modules/me/pages/BankPage";

const guarded = (to, el) => <RequireModule to={to}>{el}</RequireModule>;

// URL cũ -> URL mới (nested /attendance/*)
const REDIRECTS = [
    ["/attendance-history", "/attendance/attendance-history"],
    ["/attendance-rules", "/attendance/attendance-rules"],
    ["/statistics", "/attendance/statistics"],
    ["/leave", "/attendance/leave"],
    ["/reports", "/attendance/reports"],
    ["/promotions", "/attendance/promotions"],
    ["/handover", "/attendance/handover"],
    ["/contracts", "/attendance/contracts"],
    ["/salary", "/attendance/salary"],
    ["/insurance", "/attendance/insurance"],
    ["/bank-accounts", "/attendance/bank-accounts"],
];

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/kich-hoat" element={<ActivatePage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<HomePage />} />

                {/* Khu quản trị */}
                <Route
                    path="/employees"
                    element={guarded("/employees", <HrPage />)}
                />
                <Route
                    path="/employees/attendance-history"
                    element={guarded(
                        "/employees/attendance-history",
                        <EmployeeAttendanceHistoryPage hrMode />
                    )}
                />
                <Route
                    path="/employees/work-schedule"
                    element={guarded("/employees/work-schedule", <EmployeeWorkSchedulePage />)}
                />
                <Route
                    path="/employees/statistics"
                    element={guarded(
                        "/employees/statistics",
                        <EmployeeStatisticsPage hrMode />
                    )}
                />
                <Route path="/employees/contracts" element={guarded("/employees/contracts", <EmployeeContractPage />)} />
                <Route path="/employees/payroll" element={<Navigate to="/employees" replace />} />
                <Route
                    path="/employees/leaves"
                    element={guarded(
                        "/employees/leaves",
                        <EmployeeLeavePage hrMode />
                    )}
                />
                <Route
                    path="/employees/reports"
                    element={guarded("/employees/reports", <ReportsPage />)}
                />
                <Route
                    path="/employees/accounts"
                    element={guarded(
                        "/employees/accounts",
                        <EmployeeAccountIssuancePage hrMode />
                    )}
                />
                <Route path="/employees/promotions" element={guarded("/employees/promotions", <PromotionsPage />)} />
                <Route path="/employees/handover" element={guarded("/employees/handover", <MeHandoverPage reviewMode />)} />
                <Route
                    path="/admin/attendance-history"
                    element={guarded(
                        "/admin/attendance-history",
                        <AdminAttendanceHistoryPage />
                    )}
                />
                <Route
                    path="/admin/statistics"
                    element={guarded(
                        "/admin/statistics",
                        <AdminStatisticsPage />
                    )}
                />
                <Route
                    path="/admin/contracts"
                    element={guarded(
                        "/admin/contracts",
                        <AdminContractPage />
                    )}
                />
                <Route
                    path="/admin/leaves"
                    element={guarded(
                        "/admin/leaves",
                        <AdminLeaveAdminPage />
                    )}
                />
                <Route
                    path="/admin/payroll"
                    element={guarded(
                        "/admin/payroll",
                        <PayrollAdminPage />
                    )}
                />
                <Route
                    path="/admin/resigned"
                    element={guarded(
                        "/admin/resigned",
                        <AdminResignedPage />
                    )}
                />
                <Route
                    path="/admin/reports"
                    element={guarded(
                        "/admin/reports",
                        <ReportsPage admin />
                    )}
                />
                <Route
                    path="/admin/accounts"
                    element={guarded(
                        "/admin/accounts",
                        <AdminAccountIssuancePage />
                    )}
                />
                <Route path="/admin/employees" element={<Navigate to="/employees" replace />} />
                <Route path="/admin/employees/attendance-history" element={guarded("/admin/employees/attendance-history", <AdminAttendanceHistoryPage hrMode />)} />
                <Route path="/admin/employees/statistics" element={guarded("/admin/employees/statistics", <AdminStatisticsPage hrMode />)} />
                <Route path="/admin/employees/leaves" element={guarded("/admin/employees/leaves", <AdminLeaveAdminPage hrMode />)} />
                <Route path="/admin/employees/handover" element={guarded("/admin/employees/handover", <MeHandoverPage admin />)} />
                <Route path="/admin/employees/reports" element={guarded("/admin/employees/reports", <ReportsPage admin />)} />
                <Route path="/admin/employees/accounts" element={guarded("/admin/employees/accounts", <AdminAccountIssuancePage hrMode />)} />
                <Route path="/admin/employees/promotions" element={<Navigate to="/employees/promotions" replace />} />
                <Route path="/admin/employees/contracts" element={guarded("/admin/employees/contracts", <AdminContractPage hrMode />)} />
                <Route path="/admin/work" element={guarded("/admin/work", <AdminWorkPage />)} />
                <Route path="/admin/roles" element={guarded("/admin/roles", <AdminRolesPage />)} />
                <Route path="/admin/block-accounts" element={guarded("/admin/block-accounts", <AdminBlockAccountPage />)} />
                <Route path="/admin" element={guarded("/admin", <AdminHomepage />)} />

                {/* Khu nhân viên (module me) - nested dưới /attendance */}
                <Route path="/attendance" element={<MeClockInPage />} />
                <Route path="/attendance/attendance-history" element={<MeHistoryPage />} />
                <Route path="/attendance/attendance-rules" element={<MeRulesPage />} />
                <Route path="/attendance/statistics" element={<MeStatisticsPage />} />
                <Route path="/attendance/leave" element={<MeLeavePage />} />
                <Route path="/attendance/reports" element={guarded("/attendance/reports", <MeReportsPage />)} />
                <Route path="/attendance/promotions" element={guarded("/attendance/promotions", <MePromotionsPage selfMode />)} />
                <Route path="/attendance/handover" element={guarded("/attendance/handover", <MeHandoverPage />)} />
                <Route path="/attendance/contracts" element={<MeContractPage />} />
                <Route path="/attendance/salary" element={<MeSalaryPage />} />
                <Route path="/attendance/insurance" element={<MeInsurancePage />} />
                <Route path="/attendance/bank-accounts" element={<MeBankPage />} />

                {/* Công việc & hồ sơ (không nằm trong nhóm gộp) */}
                <Route path="/work" element={guarded("/work", <WorkPage />)} />
                <Route path="/profile" element={<ProfilePage />} />

                {/* Redirect các URL cũ -> /attendance/* */}
                {REDIRECTS.map(([from, to]) => (
                    <Route key={from} path={from} element={<Navigate to={to} replace />} />
                ))}

                <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
