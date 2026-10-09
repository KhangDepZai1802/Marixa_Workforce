namespace M.Services.Service
{
    /// <summary>
    /// Tiện ích xác định ca hành chính chuẩn của Marixa
    /// (08:00 - 16:30) làm mốc mặc định khi nhân viên chưa được gán ca kế hoạch.
    /// </summary>
    public static class AttendanceStatusEvaluator
    {
        /// <summary>
        /// Ca hành chính duy nhất của Marixa: 08:00 - 16:30.
        /// </summary>
        public static (TimeOnly Start, TimeOnly End, string Name) AdminShift()
        {
            return (new TimeOnly(8, 0), new TimeOnly(16, 30), "Ca hành chính");
        }
    }
}
