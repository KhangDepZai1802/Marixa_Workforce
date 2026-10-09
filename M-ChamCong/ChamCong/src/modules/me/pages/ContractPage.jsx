import EntityDetailPage from "../components/EntityDetailPage";

const contractTypeLabel = (t) =>
    ({
        1: "Thử việc",
        2: "Hạn định",
        3: "Không xác định thời hạn",
        4: "Mùa vụ",
    })[t] || "—";

const fmt = (d) => (d ? new Date(d).toLocaleDateString("vi-VN") : "—");

const ContractPage = () => (
    <EntityDetailPage
        kind="contract"
        title="Hợp đồng lao động"
        subtitle="Các hợp đồng làm việc của bạn"
        emptyMessage="Chưa có hợp đồng nào."
        columns={[
            { key: "contractNumber", label: "Số hợp đồng" },
            { key: "contractType", label: "Loại", render: (r) => contractTypeLabel(r.contractType) },
            { key: "startDate", label: "Ngày bắt đầu", render: (r) => fmt(r.startDate) },
            { key: "endDate", label: "Ngày kết thúc", render: (r) => (r.endDate ? fmt(r.endDate) : "Không hạn định") },
            { key: "note", label: "Ghi chú" },
        ]}
    />
);

export default ContractPage;
