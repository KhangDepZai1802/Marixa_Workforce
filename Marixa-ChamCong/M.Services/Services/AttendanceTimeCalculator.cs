using M.Contract.Repositories.Entities;

namespace M.Services.Service
{
    /// <summary>
    /// Tiện ích dùng chung: tính "Giờ thực" (net, đã trừ giờ nghỉ giữa ca) và
    /// "Tăng ca" (phần vượt mốc ra ca chuẩn) dựa trên mốc vào/ra thực tế.
    /// Dùng cho cả luồng chấm công của nhân viên (vào/ra ca) và điều chỉnh của
    /// HR/admin để đảm bảo một công thức duy nhất.
    /// </summary>
    public static class AttendanceTimeCalculator
    {
        /// <summary>Giờ VN (UTC+7) dùng để đọc mốc vào/ra và so với ca chuẩn.</summary>
        public const int VnUtcOffsetHours = 7;

        /// <summary>Cửa sổ nghỉ trưa mặc định (khớp seeder "Ca hành chính": 12:00 - 13:00).</summary>
        public static readonly TimeOnly LunchWindowStart = new(12, 0);

        /// <summary>Mốc ra ca chuẩn mặc định khi không có quy định (17:00).</summary>
        public static readonly TimeOnly DefaultStandardEnd = new(17, 0);

        /// <summary>
        /// Tính "Giờ thực" (net, tròn số giờ) và "Tăng ca" (decimal, >= 0).
        /// </summary>
        /// <param name="checkIn">Giờ vào ca (UTC, có thể null).</param>
        /// <param name="checkOut">Giờ ra ca (UTC, có thể null).</param>
        /// <param name="breakMinutes">Giờ nghỉ giữa ca được trừ (theo quy định/ca).</param>
        /// <param name="standardEnd">Mốc ra ca chuẩn để tính tăng ca (null = 17:00).</param>
        public static (int? ActualHours, decimal? OvertimeHours) Compute(
            DateTimeOffset? checkIn,
            DateTimeOffset? checkOut,
            int? breakMinutes,
            TimeOnly? standardEnd)
        {
            // Chưa đủ cặp vào - ra (hoặc ra trước vào) -> chưa tính được.
            if (!checkIn.HasValue || !checkOut.HasValue || checkOut < checkIn)
                return (null, null);

            int breakMin = Math.Max(0, breakMinutes ?? 0);
            TimeOnly stdEnd = standardEnd ?? DefaultStandardEnd;

            var inVn = ToVnTimeOnly(checkIn.Value);
            var outVn = ToVnTimeOnly(checkOut.Value);

            int elapsedMin = MinutesBetween(inVn, outVn);
            if (elapsedMin <= 0)
                return (0, 0m);

            // ===== GIỜ THỰC (net): trừ phần đè lên cửa sổ nghỉ trưa =====
            int lunchBreakMin = 0;
            if (breakMin > 0)
            {
                int lunchStartMin = ToMinutes(LunchWindowStart);
                int lunchEndMin = lunchStartMin + breakMin;
                int inMin = ToMinutes(inVn);
                int outMin = ToMinutes(outVn);
                int overlapStart = Math.Max(inMin, lunchStartMin);
                int overlapEnd = Math.Min(outMin, lunchEndMin);
                if (overlapEnd > overlapStart)
                    lunchBreakMin = Math.Min(breakMin, overlapEnd - overlapStart);
            }

            int netMin = Math.Max(0, elapsedMin - lunchBreakMin);
            int? actualHours = (int)Math.Round(netMin / 60.0);

            // ===== TĂNG CA: phần vượt mốc ra ca chuẩn =====
            int otMin = Math.Max(0, ToMinutes(outVn) - ToMinutes(stdEnd));
            decimal overtimeHours = otMin > 0 ? Math.Round(otMin / 60m, 1) : 0m;

            return (actualHours, overtimeHours);
        }

        /// <summary>
        /// Tính và gán lại ActualHours (net) + OvertimeHours (transient) cho một
        /// bản ghi Attendance dựa trên giờ vào/ra thực (override nếu có, nếu không
        /// lấy từ AttendanceLogs) và quy định đang áp dụng. Dùng trước khi map
        /// về view model để "Tăng ca" luôn có giá trị khi đọc, không phải đợi HR.
        /// </summary>
        public static void Enrich(Attendance a, AttendanceRule? rule)
        {
            if (a == null) return;

            var checkIn = a.CheckInTime
                ?? a.AttendanceLogs?
                    .Where(x => x.Type == AttendanceLogType.CheckIn)
                    .Select(x => (DateTimeOffset?)x.LogTime)
                    .Min();

            var checkOut = a.CheckOutTime
                ?? a.AttendanceLogs?
                    .Where(x => x.Type == AttendanceLogType.CheckOut)
                    .Select(x => (DateTimeOffset?)x.LogTime)
                    .Max();

            var (net, ot) = Compute(checkIn, checkOut, rule?.BreakMinutes, rule?.CheckOutTime);
            a.ActualHours = net;
            a.OvertimeHours = ot;
        }

        // ===== Helpers =====
        private static TimeOnly ToVnTimeOnly(DateTimeOffset o)
        {
            var vn = o.ToOffset(TimeSpan.FromHours(VnUtcOffsetHours));
            return new TimeOnly(vn.Hour, vn.Minute);
        }

        private static int ToMinutes(TimeOnly t) => t.Hour * 60 + t.Minute;

        private static int MinutesBetween(TimeOnly a, TimeOnly b)
        {
            int diff = ToMinutes(b) - ToMinutes(a);
            return diff < 0 ? diff + 24 * 60 : diff; // ca qua nửa đêm
        }
    }
}
