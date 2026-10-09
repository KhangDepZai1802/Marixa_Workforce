import { useRef, useState, useEffect } from "react";

// Chụp ảnh qua webcam theo phong cách marixa:
// - Chờ: nút "Chụp ảnh" to viền chấm
// - Bật: preview video + nút "Chụp"
// - Chụp xong: xem trước ảnh + "Xóa" và "Chụp lại"
// Prop `locked`: ảnh đã sẵn sàng cho lần chấm công -> khóa 2 nút.
const CameraCapture = ({ onPhoto, locked }) => {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [active, setActive] = useState(false);
    const [error, setError] = useState("");
    const [shot, setShot] = useState(null);

    // Dừng camera khi rời trang
    useEffect(
        () => () => {
            streamRef.current?.getTracks().forEach((t) => t.stop());
        },
        []
    );

    // Gán stream vào thẻ video (bắt buộc, thiếu dòng này sẽ chỉ hiện khung đen)
    useEffect(() => {
        if (active && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [active]);

    const stop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setActive(false);
    };

    const start = async () => {
        try {
            setError("");
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: "user" },
            });
            streamRef.current = stream;
            // srcObject được gán trong useEffect khi thẻ video mount
            setActive(true);
        } catch {
            setError("Không truy cập được camera. Hãy cấp quyền và thử lại.");
        }
    };

    const capture = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) {
            setError("Camera chưa sẵn sàng. Vui lòng thử lại.");
            return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    setError("Không chụp được ảnh.");
                    return;
                }
                const photo = new File([blob], "attendance-photo.jpg", {
                    type: "image/jpeg",
                });
                setShot(photo);
                onPhoto?.(photo);
            },
            "image/jpeg",
            0.85
        );
        stop();
    };

    // Xóa ảnh: bỏ ảnh vừa chụp, không gửi kèm khi vào/ra ca
    const remove = () => {
        setShot(null);
        onPhoto?.(null);
    };

    // Chụp lại: xóa ảnh cũ rồi mở camera
    const retake = () => {
        remove();
        start();
    };

    if (shot) {
        return (
            <div className="att-cam-done">
                <img
                    key={shot.name}
                    src={URL.createObjectURL(shot)}
                    alt="Ảnh đã chụp"
                />
                <div>
                    <strong>Ảnh vừa chụp</strong>
                    <span className="att-muted">
                        {locked
                            ? "Ảnh sẽ được gửi kèm khi bạn nhấn chấm công."
                            : "Sẽ gửi kèm khi bạn nhấn Vào ca / Ra ca."}
                    </span>
                    <div className="att-cam-done-actions">
                        <button
                            type="button"
                            className="att-cam-btn-remove"
                            onClick={remove}
                            disabled={locked}
                        >
                            Xóa
                        </button>
                        <button
                            type="button"
                            onClick={retake}
                            disabled={locked}
                        >
                            Chụp lại
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (active) {
        return (
            <div className="att-cam">
                <video ref={videoRef} autoPlay playsInline muted />
                <button type="button" onClick={capture}>
                    Chụp
                </button>
                {error && <p className="att-cam-error">{error}</p>}
            </div>
        );
    }

    return (
        <div>
            <div className="att-cam-idle">
                <button type="button" onClick={start}>
                    📷 Chụp ảnh
                </button>
            </div>
            {error && <p className="att-cam-error">{error}</p>}
        </div>
    );
};

export default CameraCapture;
