// Lưu thông tin đăng nhập vào localStorage
const AUTH_KEY = "marixa_auth";

export const saveAuth = (data) => {
    const payload = {
        token: data?.token || data?.accessToken || null,
        userId: data?.userId,
        employeeId: data?.employeeId,
        userName: data?.userName,
        employeeCode: data?.employeeCode,
        picture: data?.picture || null,
        roles: data?.roles || [],
        expiredAt: data?.expiredAt,
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
};

export const getAuth = () => {
    try {
        const raw = localStorage.getItem(AUTH_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const clearAuth = () => {
    localStorage.removeItem(AUTH_KEY);
};
