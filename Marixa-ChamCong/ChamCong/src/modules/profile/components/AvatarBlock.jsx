import { useState, useEffect, useRef } from "react";
import {
    getAvatar,
    setAvatar,
    fileToAvatarDataUrl,
    subscribeAvatarChange,
} from "../../../services/avatar/avatar";

// Avatar block dùng chung cho trang Hồ sơ.
const AvatarBlock = ({ auth, notice }) => {
    const key = auth?.userId;
    const [busy, setBusy] = useState(false);
    const [avatar, setAvatarState] = useState(() => getAvatar(key));
    const fileRef = useRef(null);

    // Đồng bộ khi avatar đổi (vd từ menu dropdown trên header).
    useEffect(
        () =>
            subscribeAvatarChange(({ key: k }) => {
                if (k === key) setAvatarState(getAvatar(key));
            }),
        [key]
    );

    const src = avatar || auth?.picture || null;

    const pick = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || !key) return;
        setBusy(true);
        try {
            const dataUrl = await fileToAvatarDataUrl(file);
            setAvatar(key, dataUrl);
            setAvatarState(dataUrl);
            notice("Đã đổi ảnh đại diện.");
        } catch {
            notice("Không thể đọc ảnh, vui lòng thử lại.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="profile-avatar">
            <div className="profile-avatar-img">
                {src ? (
                    <img src={src} alt="Ảnh đại diện" />
                ) : (
                    <span>
                        {(auth?.userName || "?")
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                    </span>
                )}
            </div>
            <button
                type="button"
                className="profile-avatar-btn"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
            >
                {busy ? "Đang xử lý..." : "Đổi ảnh đại diện"}
            </button>
            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={pick}
            />
        </div>
    );
};

export { AvatarBlock };
