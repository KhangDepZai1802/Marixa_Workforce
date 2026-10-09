import EntityDetailPage from "../components/EntityDetailPage";

const statusLabel = (s) =>
    ({ 1: "Đang đóng", 2: "Tạm dừng", 3: "Đã chốt sổ" })[s] || "—";

const money = (n) =>
    n == null ? "—" : Number(n).toLocaleString("vi-VN") + " ₫";

const InsurancePage = () => (
    <EntityDetailPage
        kind="insurance"
        title="Bảo hiểm & thuế"
        subtitle="Thông tin BHXH, BHYT và mã số thuế của bạn"
        emptyMessage="Chưa có thông tin bảo hiểm."
        columns={[
            { key: "socialInsuranceNumber", label: "Số BHXH", render: (r) => r.socialInsuranceNumber || "—" },
            { key: "healthInsuranceNumber", label: "Số BHYT", render: (r) => r.healthInsuranceNumber || "—" },
            { key: "personalTaxCode", label: "Mã số thuế", render: (r) => r.personalTaxCode || "—" },
            { key: "socialInsuranceSalary", label: "Lương BHXH", render: (r) => money(r.socialInsuranceSalary) },
            { key: "isParticipant", label: "Tham gia BHXH", render: (r) => (r.isSocialInsuranceParticipant ? "Có" : "Không") },
            { key: "status", label: "Trạng thái", render: (r) => statusLabel(r.status) },
        ]}
    />
);

export default InsurancePage;
