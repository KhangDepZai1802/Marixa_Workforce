import { useState } from "react";
import authApi from "../../modules/login/api/authApi";
import { getAuth } from "../../services/auth/auth";

const ChangePasswordModal = ({ onClose }) => {
    const auth = getAuth();
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        if (next !== confirm) {
            setError("Xác nhận mật khẩu không khớp.");
            return;
        }
        setBusy(true);
        setError("");
        try {
            await authApi.changePassword({
                userId: auth?.userId,
                currentPassword: current,
                newPassword: next,
                confirmPassword: confirm,
            });
            onClose(true);
        } catch (err) {
            setError(err.response?.data?.message || "Không thể đổi mật khẩu.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="att-guide-overlay">
            <div className="att-guide" onClick={(e) => e.stopPropagation()}>
                <div className="att-guide-head">
                    <h2>Đổi mật khẩu</h2>
                    <button
                        type="button"
                        className="att-head-close"
                        onClick={() => onClose()}
                        aria-label="Đóng"
                    >
                        ×
                    </button>
                </div>
                {error && <div className="att-error">{error}</div>}
                <form
                    onSubmit={submit}
                    className="att-cpw-form"
                >
                    <label>
                        Mật khẩu hiện tại
                        <input
                            type="password"
                            value={current}
                            onChange={(e) => setCurrent(e.target.value)}
                            required
                        />
                    </label>
                    <label>
                        Mật khẩu mới
                        <input
                            type="password"
                            value={next}
                            onChange={(e) => setNext(e.target.value)}
                            required
                            minLength={10}
                        />
                    </label>
                    <label>
                        Xác nhận mật khẩu mới
                        <input
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                        />
                    </label>
                    <p className="att-cpw-hint">
                        Tối thiểu 10 ký tự, gồm chữ hoa, chữ thường, số và ký
                        tự đặc biệt.
                    </p>
                    <button type="submit" className="att-guide-close" disabled={busy}>
                        {busy ? "Đang xử lý..." : "Lưu mật khẩu"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
