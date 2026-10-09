import { useEffect, useRef, useState } from "react";
import { clearAuth, getAuth } from "../../services/auth/auth";
import {
    fileToAvatarDataUrl,
    getAvatar,
    setAvatar,
    subscribeAvatarChange,
} from "../../services/avatar/avatar";
import { GuideModal } from "./GuideModal";
import LanguagePicker from "./LanguagePicker";
import NotificationBell from "./NotificationBell";
import ChangePasswordModal from "./ChangePasswordModal";

import "./header.css";


// Thanh nav toàn rộng: logo + slogan (trái), nút gập sidebar,
// nút vuông dropdown tài khoản (phải).
const Header = ({ profile, onToggleSidebar, collapsed, minimal = false }) => {
    const auth = getAuth();
    const key = auth?.userId;
    

    const [open, setOpen] = useState(false);
    const [modal, setModal] = useState(null);
    const [avatar, setAvatarState] = useState(() => getAvatar(key));
    const [avatarBusy, setAvatarBusy] = useState(false);

    // Đồng bộ avatar khi bị đổi ở nơi khác (vd trang Hồ sơ).
    useEffect(
        () =>
            subscribeAvatarChange(({ key: k }) => {
                if (k === key) setAvatarState(getAvatar(key));
            }),
        [key]
    );

    // Đóng menu khi click ngoài.
    const userRef = useRef(null);
    const fileRef = useRef(null);
    useEffect(() => {
        const onDown = (e) => {
            if (userRef.current && !userRef.current.contains(e.target))
                setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    const [notice, setNotice] = useState("");
    const showNotice = (msg) => {
        setNotice(msg);
        setTimeout(() => setNotice(""), 3000);
    };

    const name = profile?.fullName || auth?.userName || "Nhân viên";
    const code = profile?.employeeCode || auth?.employeeCode || "";
    const imgSrc = avatar || auth?.picture || null;

    const pickAvatar = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || !key) return;
        setAvatarBusy(true);
        try {
            const dataUrl = await fileToAvatarDataUrl(file);
            setAvatar(key, dataUrl);
            setAvatarState(dataUrl);
            setOpen(false);
            showNotice("Đã đổi ảnh đại diện.");
        } catch {
            showNotice("Không thể đọc ảnh, vui lòng thử lại.");
        } finally {
            setAvatarBusy(false);
        }
    };

    const logout = () => {
        clearAuth();
        window.location.href = "/login";
    };

    return (
        <header className={`app-header${minimal ? " app-header--minimal" : ""}`}>
            <div className="app-header-left">
                {!minimal && (
                    <button
                        type="button"
                        className="app-header-toggle"
                        aria-label={collapsed ? "Mở thanh menu" : "Gập thanh menu"}
                        onClick={onToggleSidebar}
                    >
                        <span />
                        <span />
                        <span />
                    </button>
                )}
                <a href="/home" className="app-header-brand">
                    <span className="app-header-logo">M</span>
                    <span className="app-header-logo-text">MARIXA</span>
                    {!minimal && (
                        <span className="app-header-slogan">
                            Chấm công &amp; quản lý nhân sự
                        </span>
                    )}
                </a>
            </div>

            <div className="app-header-user" ref={userRef}>
                                <NotificationBell />
                <LanguagePicker />
                <button
                    type="button"
                    className="app-header-avatar-btn"
                    aria-haspopup="menu"
                    aria-expanded={open}
                    aria-label="Tùy chọn tài khoản"
                    onClick={() => setOpen((v) => !v)}
                >
                    {imgSrc ? (
                        <img src={imgSrc} alt="Ảnh đại diện" />
                    ) : (
                        <span>{name.trim().charAt(0).toUpperCase() || "?"}</span>
                    )}
                </button>

                {open && (
                    <div className="app-header-menu" role="menu">
                        <div className="app-header-menu-head">
                            <strong>{name}</strong>
                            <span>{code || "—"}</span>
                        </div>
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                setOpen(false);
                                setModal("password");
                            }}
                        >
                            Đổi mật khẩu
                        </button>
                        <button
                            type="button"
                            role="menuitem"
                            disabled={avatarBusy}
                            onClick={() => fileRef.current?.click()}
                        >
                            Đổi ảnh đại diện
                        </button>
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                setOpen(false);
                                setModal("guide");
                            }}
                        >
                            Hướng dẫn
                        </button>
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                setOpen(false);
                                window.location.href = "/profile";
                            }}
                        >
                            Hồ sơ
                        </button>
                        <div className="app-header-menu-sep" />
                        <button
                            type="button"
                            role="menuitem"
                            className="danger"
                            onClick={logout}
                        >
                            Đăng xuất
                        </button>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={pickAvatar}
                        />
                    </div>
                )}

                {notice && <div className="app-header-notice">{notice}</div>}
                {modal === "guide" && (
                    <GuideModal onClose={() => setModal(null)} />
                )}
                {modal === "password" && (
                    <ChangePasswordModal
                        onClose={(ok) => {
                            setModal(null);
                            if (ok) showNotice("Đã đổi mật khẩu thành công.");
                        }}
                    />
                )}
            </div>
        </header>
    );
};

export default Header;
