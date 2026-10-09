import { useState } from "react";
import authApi from "../api/authApi";
import { saveAuth } from "../../../services/auth/auth";

const LoginForm = () => {
  const [form, setForm] = useState({
    username: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const response = await authApi.login(form);
      const data = response.data?.data ?? response.data;

      saveAuth(data);
      window.location.href = "/home";
    } catch (err) {
      const responseMessage = err.response?.data?.message;
      const responseData = err.response?.data?.data;
      setError(
        typeof responseMessage === "string"
          ? responseMessage
          : typeof responseData === "string"
            ? responseData
            : !err.response
              ? "Không kết nối được máy chủ API. Hãy bật backend hoặc kiểm tra VITE_API_BASE_URL."
              : "Đăng nhập thất bại. Vui lòng kiểm tra tài khoản và mật khẩu.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <div className="form-group">
        <label htmlFor="username">Tài khoản</label>
        <input
          id="username"
          type="text"
          name="username"
          value={form.username}
          onChange={handleChange}
          placeholder="Nhập tên đăng nhập"
          autoComplete="username"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Mật khẩu</label>
        <div className="password-wrapper">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
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

      <div className="remember-me">
        <input
          type="checkbox"
          id="rememberMe"
          name="rememberMe"
          checked={form.rememberMe}
          onChange={handleChange}
        />
        <label htmlFor="rememberMe">Ghi nhớ đăng nhập</label>
      </div>

      {error && <div className="login-error">{error}</div>}

      <button type="submit" className="login-btn" disabled={loading}>
        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
};

export default LoginForm;
