import Link from "next/link";

export default function NotFound() {
  return <main className="not-found"><h1>Không tìm thấy trang</h1><p>Đường dẫn có thể đã thay đổi hoặc không còn tồn tại.</p><Link className="button button-primary" href="/home">Về trang chủ</Link></main>;
}
