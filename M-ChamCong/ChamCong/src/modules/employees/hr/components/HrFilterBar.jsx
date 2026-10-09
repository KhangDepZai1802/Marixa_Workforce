import { useRef, useState, useEffect } from "react";

// Thanh bộ lọc + dropdown hành động (Nhập/Xuất Excel, Tải mẫu) + nút thêm nhân viên.
const HrFilterBar = ({
    departments,
    positions,
    filters,
    setters,
    onAdd,
    hasActiveFilter,
    onImportFile,
    onExport,
    onTemplate,
    showActions = true,
}) => {
    const fileRef = useRef(null);
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        const close = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        const key = (e) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", close);
        document.addEventListener("keydown", key);
        return () => {
            document.removeEventListener("mousedown", close);
            document.removeEventListener("keydown", key);
        };
    }, []);

    const runAction = (fn) => {
        fn();
        setOpen(false);
    };

    return (
        <div className="hr-filter-bar">
            <div className="hr-filter-fields">
                <label className="admin-search hr-filter-search">
                    <span aria-hidden="true">⌕</span>
                    <input
                        type="search"
                        placeholder="Tìm tên, mã NV, email..."
                        value={filters.search}
                        onChange={(e) => setters.setSearch(e.target.value)}
                    />
                </label>
                <select
                    className="hr-select"
                    value={filters.department}
                    onChange={(e) => setters.setDepartment(e.target.value)}
                >
                    <option value="">Phòng ban</option>
                    {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                            {d.name}
                        </option>
                    ))}
                </select>
                <select
                    className="hr-select"
                    value={filters.position}
                    onChange={(e) => setters.setPosition(e.target.value)}
                >
                    <option value="">Chức vụ</option>
                    {positions.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    className={`hr-btn hr-btn--ghost hr-clear-filter${hasActiveFilter ? "" : " hr-clear-filter--hidden"}`}
                    onClick={setters.reset}
                    disabled={!hasActiveFilter}
                    aria-hidden={!hasActiveFilter}
                    tabIndex={hasActiveFilter ? 0 : -1}
                >
                    ✕ Xóa lọc
                </button>
            </div>

            {showActions && (
                <div className="hr-actions" ref={wrapRef}>
                    <div className="hr-dropdown">
                        <button
                            type="button"
                            className="hr-btn hr-btn--ghost hr-dropdown-toggle"
                            aria-haspopup="menu"
                            aria-expanded={open}
                            onClick={() => setOpen((v) => !v)}
                        >
                            <span aria-hidden="true">⇩</span> Hành động
                            <span className="hr-dropdown-caret" aria-hidden="true">▾</span>
                        </button>
                        {open && (
                            <div className="hr-dropdown-menu" role="menu">
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => runAction(() => fileRef.current?.click())}
                                >
                                    <span aria-hidden="true">⬆</span> Nhập Excel / CSV
                                </button>
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => runAction(onTemplate)}
                                >
                                    <span aria-hidden="true">⬇</span> Tải mẫu Excel
                                </button>
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => runAction(onExport)}
                                >
                                    <span aria-hidden="true">⬇</span> Xuất danh sách
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        className="hr-btn hr-btn--primary"
                        onClick={onAdd}
                    >
                        + Thêm nhân viên
                    </button>
                </div>
            )}

            <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.csv"
                hidden
                onChange={(e) => {
                    onImportFile?.(e.target.files?.[0]);
                    e.target.value = "";
                }}
            />
        </div>
    );
};

export default HrFilterBar;