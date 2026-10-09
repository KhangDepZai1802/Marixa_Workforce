import EntityDetailPage from "../components/EntityDetailPage";

const spaced = (v) =>
    v ? String(v).replace(/(\d{4})(?=\d)/g, "$1 ") : "—";

const BankPage = () => (
    <EntityDetailPage
        kind="bank"
        title="Tài khoản ngân hàng"
        subtitle="Thông tin tài khoản nhận lương của bạn"
        emptyMessage="Chưa có tài khoản ngân hàng."
        columns={[
            { key: "bankName", label: "Ngân hàng", render: (r) => r.bankName || "—" },
            { key: "accountNumber", label: "Số tài khoản", render: (r) => spaced(r.accountNumber) },
            { key: "accountHolderName", label: "Chủ tài khoản", render: (r) => r.accountHolderName || "—" },
            {
                key: "isPrimary",
                label: "Loại",
                render: (r) =>
                    r.isPrimary ? (
                        <span className="att-badge info">&#9733; Chính</span>
                    ) : (
                        <span className="att-badge">Phụ</span>
                    ),
            },
        ]}
    />
);

export default BankPage;
