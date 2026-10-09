// Ảnh đại diện cá nhân lưu trong localStorage (key theo userId).
// Dùng sự kiện "marixa-avatar-change" để đồng bộ giữa các component.
const AVATAR_PREFIX = "marixa_avatar_";
const CHANGE_EVENT = "marixa-avatar-change";

export const getAvatar = (key) => {
    if (!key) return null;
    try {
        return localStorage.getItem(AVATAR_PREFIX + key) || null;
    } catch {
        return null;
    }
};

export const setAvatar = (key, dataUrl) => {
    if (!key) return;
    try {
        if (dataUrl) localStorage.setItem(AVATAR_PREFIX + key, dataUrl);
        else localStorage.removeItem(AVATAR_PREFIX + key);
        window.dispatchEvent(
            new CustomEvent(CHANGE_EVENT, { detail: { key } })
        );
    } catch {
        // Ảnh quá lớn cho localStorage: bỏ qua, không chặn luồng.
    }
};

export const subscribeAvatarChange = (cb) => {
    const handler = (e) => cb(e.detail || {});
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
};

// Đọc file ảnh -> data URL, nén tối đa 512px để gọn bộ nhớ.
export const fileToAvatarDataUrl = (file, maxSize = 512) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(
                    1,
                    maxSize / Math.max(img.width, img.height)
                );
                const w = Math.round(img.width * scale);
                const h = Math.round(img.height * scale);
                const canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
                canvas.getContext("2d").drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL("image/jpeg", 0.9));
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
