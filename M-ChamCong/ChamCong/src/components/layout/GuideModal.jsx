const STEPS = [
    { lead: "Nhấn ", label: "Chụp ảnh", tail: " để chụp 1 tấm ảnh của bạn." },
    { lead: "Nhấn ", label: "VÀO CA", tail: " để lưu giờ vào kèm ảnh." },
    { lead: "Khi xong việc, nhấn ", label: "RA CA", tail: " để lưu giờ ra." },
    { plain: "Ảnh giúp quản lý xác nhận bạn có mặt — chỉ cần thật, rõ mặt." },
];

const GuideModal = ({ onClose }) => {
    return (
        <div className="att-guide-overlay" onClick={onClose}>
            <div className="att-guide" onClick={(e) => e.stopPropagation()}>
                <h2>Cách chấm công</h2>
                <ol>
                    {STEPS.map((s, i) =>
                        s.plain ? (
                            <li key={i}>{s.plain}</li>
                        ) : (
                            <li key={i}>
                                {s.lead}
                                <strong>{s.label}</strong>
                                {s.tail}
                            </li>
                        )
                    )}
                </ol>
                <button
                    type="button"
                    className="att-guide-close"
                    onClick={onClose}
                >
                    Bắt đầu
                </button>
            </div>
        </div>
    );
};

export { GuideModal };
