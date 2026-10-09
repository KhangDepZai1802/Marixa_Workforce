import { useState } from "react";
import { useNavigate } from "react-router-dom";
import authApi from "../../login/api/authApi";
import LanguagePicker from "../../../components/layout/LanguagePicker";
import logo from "../../../assets/images/marixa-logo.png";
import "../../login/login.css";

// Trang kích hoạt tài khoản: nhân viên nhập mã kích hoạt do Nhân sự bàn giao
// rồi tự đặt mật khẩu (chính sách: >= 10 ký tự, hoa/thường/số/ký tự đặc biệt).
const PW_RULES = [
    { key: "len", label: "Tối thiểu 10 ký tự" },
    { key: "lower", label: "Có chữ thường" },
    { key: "upper", label: "Có chữ HOA" },
    { key: "digit", label: "Có ít nhất một chữ số" },
    { key: "special", label: "Có ít nhất một ký tự đặc biệt (@, #, !...)" },
];

const checkRule = (key, pw) => {
    switch (key) {
        case "len": return pw.length >= 10;
        case "lower": return /[a-z]/.test(pw);
        case "upper": return /[A-Z]/.test(pw);
        case "digit": return /\d/.test(pw);
        case "special": return /[^A-Za-z0-9]/.test(pw);
        default: return true;
    }
};

const ActivateForm = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({ code: "", password: "", confirmPassword: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const setField = (name) => (e) =>
        setForm((prev) => ({ ...prev, [name]: e.target.value }));

    // Chỉ kích hoạt được khi đủ chính sách mật khẩu + 2 ô khớp
    const rulesOk = PW_RULES.every((r) => checkRule(r.key, form.password));
    const matchOk =
        form.confirmPassword.length > 0 && form.password === form.confirmPassword;
    const canSubmit = rulesOk && matchOk && form.code.trim() !== "";

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit || loading) return;
        setLoading(true);
        setError("");
        try {
            await authApi.activate({
                code: form.code.trim(),
                password: form.password,
                confirmPassword: form.confirmPassword,
            });
            navigate("/login", { state: { activated: true } });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Kích hoạt thất bại. Vui lòng kiểm tra mã kích hoạt và thử lại."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="login-form activate-form">
            <div className="form-group">
                <label htmlFor="code">Mã kích hoạt</label>
                <input
                    id="code"
                    type="text"
                    value={form.code}
                    onChange={setField("code")}
                    placeholder="Ví dụ: ACT-1A2B3C"
                    autoComplete="off"
                    required
                />
                <p className="activate-hint">Mã do bộ phận Nhân sự bàn giao. Dùng được một lần và có hạn.</p>
            </div>

            <div className="form-group">
                <label htmlFor="newPassword">Mật khẩu mới của bạn</label>
                <div className="password-wrapper">
                    <input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={setField("password")}
                        placeholder="Đặt mật khẩu của riêng bạn"
                        autoComplete="new-password"
                        required
                    />
                    <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                        {showPassword ? "Ẩn" : "Hiện"}
                    </button>
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="confirmPassword">Nhập lại mật khẩu mới</label>
                <div className="password-wrapper">
                    <input
                        id="confirmPassword"
                        type={showConfirm ? "text" : "password"}
                        value={form.confirmPassword}
                        onChange={setField("confirmPassword")}
                        placeholder="Nhập lại mật khẩu"
                        autoComplete="new-password"
                        required
                    />
                    <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowConfirm((v) => !v)}
                        aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                        {showConfirm ? "Ẩn" : "Hiện"}
                    </button>
                </div>
                {form.confirmPassword.length > 0 && !matchOk && (
                    <p className="activate-mismatch">Hai mật khẩu chưa khớp.</p>
                )}
            </div>

            <ul className="activate-rules">
                {PW_RULES.map((r) => (
                    <li key={r.key} className={checkRule(r.key, form.password) ? "done" : ""}>
                        {checkRule(r.key, form.password) ? "✓" : "•"} {r.label}
                    </li>
                ))}
            </ul>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-btn" disabled={loading || !canSubmit}>
                {loading ? "Đang kích hoạt..." : "Kích hoạt và đặt mật khẩu"}
            </button>
        </form>
    );
};

const ActivatePage = () => {
    return (
        <div className="login-page">
            <LanguagePicker className="lang-picker--corner" />
            <div className="login-brand">
                <div className="login-brand-logo">
                    <img src={logo} alt="MARIXA" />
                    <span>MARIXA</span>
                </div>
                <h2>Kích hoạt tài khoản</h2>
                <p>Nhập mã kích hoạt bộ phận Nhân sự đã bàn giao, rồi tự đặt mật khẩu riêng của bạn. Không ai khác biết mật khẩu này — kể cả Nhân sự.</p>
                <div className="login-brand-badge">
                    <span className="badge-dot" />
                    One-time activation
                </div>
            </div>
            <div className="login-content">
                <div className="login-card">
                    <h1>Đặt mật khẩu</h1>
                    <p className="login-subtitle">Kích hoạt tài khoản bằng mã kích hoạt và mật khẩu mới</p>
                    <ActivateForm />
                </div>
            </div>
        </div>
    );
};

export default ActivatePage;
