// Thanh phân trang: [←] 1 2 3 ... [→]  + "1–20 / 1,248 nhân viên".
// Số trang lớn -> hiển thị 5 số đầu, dấu ..., số cuối.
const HrPagination = ({ page, pageCount, totalItems, onPrev, onNext, onPage }) => {
    if (pageCount <= 0) return null;

    // danh sách số trang hiển thị: [1,2,3,4,5,...,last]
    const pages = [];
    const windowEnd = Math.min(5, pageCount);
    for (let i = 1; i <= windowEnd; i++) pages.push(i);
    if (pageCount > 5) {
        pages.push("...");
        pages.push(pageCount);
    }

    const rangeStart = (page - 1) * 20 + 1;
    const rangeEnd = Math.min(page * 20, totalItems);

    return (
        <div className="hr-pagination">
            <button
                type="button"
                className="hr-page-btn"
                onClick={onPrev}
                disabled={page === 1}
                aria-label="Trang trước"
            >
                ←
            </button>
            <div className="hr-page-list">
                {pages.map((p, i) =>
                    p === "..." ? (
                        <span key={`gap-${i}`} className="hr-page-gap">
                            ...
                        </span>
                    ) : (
                        <button
                            key={p}
                            type="button"
                            className={`hr-page-num${p === page ? " active" : ""}`}
                            onClick={() => onPage(p)}
                        >
                            {p}
                        </button>
                    )
                )}
            </div>
            <button
                type="button"
                className="hr-page-btn"
                onClick={onNext}
                disabled={page >= pageCount}
                aria-label="Trang sau"
            >
                →
            </button>
            <span className="hr-page-summary">
                {rangeStart}–{rangeEnd} / {totalItems.toLocaleString("vi-VN")}{" "}
                nhân viên
            </span>
        </div>
    );
};

export default HrPagination;
