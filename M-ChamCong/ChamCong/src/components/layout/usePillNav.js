import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Mobile: các sidebar (user / admin / HR / work) là thanh pill nằm ngang,
// cố định dưới header. Mỗi khi đổi tab, layout REMOUNT -> DOM thanh pill bị
// tạo lại và scrollLeft về 0. Hook này giữ thanh "đứng yên đúng tab đang chọn":
// - ngay frame đầu tiên (rAF, trước lần paint kế tiếp) cuộn NGAY (behavior auto)
//   về giữa item active -> người dùng không thấy cảnh thanh "quay về đầu".
// - retry cho tới khi DOM/đo kích thước sẵn sàng (thanh chưa overflow thì bỏ qua).
export function usePillNavActiveInView() {
    const location = useLocation();

    useEffect(() => {
        let frame = 0;
        let tries = 0;

        const center = (smooth) => {
            const active = document.querySelector(".att-sidebar-nav .att-nav-item.active");
            const bar = active ? active.closest(".att-sidebar") : null;
            if (!bar || bar.scrollWidth <= bar.clientWidth) return true; // không overflow -> không cần cuộn
            const left = active.offsetLeft - (bar.clientWidth - active.offsetWidth) / 2;
            bar.scrollTo({ left: Math.max(0, left), behavior: smooth ? "smooth" : "auto" });
            return true;
        };

        const attempt = () => {
            tries += 1;
            if (center(tries > 1)) return;
            if (tries < 10) frame = requestAnimationFrame(attempt);
        };

        attempt();
        return () => cancelAnimationFrame(frame);
    }, [location.pathname]);
}
