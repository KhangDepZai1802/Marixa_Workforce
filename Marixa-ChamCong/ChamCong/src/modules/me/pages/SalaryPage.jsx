import EntityDetailPage from "../components/EntityDetailPage";

const paymentTypeLabel = (t) =>
    ({
        1: "Theo tháng",
        2: "Theo ngày",
        3: "Theo giờ",
        4: "Theo sản phẩm",
    })[t] || "—";

const money = (n) =>
    n == null ? "—" : Number(n).toLocaleString("vi-VN") + " ₫";

const fmt = (d) => (d ? new Date(d).toLocaleDateString("vi-VN") : "—");

const SalaryPage = () => (
    <EntityDetailPage
        kind="salary"
        title="Bảng lương"
        subtitle="Mức thu nhập và phụ cấp của bạn"
        emptyMessage="Chưa có dữ liệu lương."
        columns={[
            { key: "paymentType", label: "Hình thức", render: (r) => paymentTypeLabel(r.paymentType) },
            { key: "basicSalary", label: "Lương cơ bản", render: (r) => money(r.basicSalary) },
            { key: "dailyRate", label: "Đơn giá / ngày", render: (r) => (r.dailyRate ? money(r.dailyRate) : "—") },
            { key: "positionAllowance", label: "Phụ cấp chức vụ", render: (r) => (r.positionAllowance ? money(r.positionAllowance) : "—") },
            { key: "bonus", label: "Thưởng", render: (r) => (r.bonus ? money(r.bonus) : "—") },
            { key: "effectiveFrom", label: "Hiệu lực từ", render: (r) => fmt(r.effectiveFrom) },
            { key: "effectiveTo", label: "Hiệu lực đến", render: (r) => (r.effectiveTo ? fmt(r.effectiveTo) : "Không giới hạn") },
        ]}
    />
);

export default SalaryPage;
