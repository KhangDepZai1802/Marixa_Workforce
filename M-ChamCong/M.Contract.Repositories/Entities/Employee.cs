using M.Contract.Repositories.Entity;
using M.Core.Base;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace M.Contract.Repositories.Entities
{
    public class Employee : BaseEntity
    {
        // =========================================================
        // THÔNG TIN CƠ BẢN
        // =========================================================

        [Required]
        [MaxLength(50)]
        public string EmployeeCode { get; set; } = string.Empty;

        // Tên gọi (ví dụ: tên riêng)
        [Required]
        [MaxLength(100)]
        public string GivenName { get; set; } = string.Empty;

        // Họ / tên đệm
        [Required]
        [MaxLength(100)]
        public string FamilyName { get; set; } = string.Empty;
        // FullName không lưu vào DB
        [NotMapped]
        public string FullName => $"{GivenName} {FamilyName}".Trim();

        // Ngày sinh
        public DateTime? BirthDate { get; set; }

        // Giới tính với giá trị mặc định là RatherNotSay
        public GenderType Gender { get; set; } = GenderType.RatherNotSay;


        // =========================================================
        // THÔNG TIN CCCD
        // =========================================================

        // Số CCCD/CMT (có thể null)
        [MaxLength(20)]
        public string? CitizenId { get; set; }

        // Ngày cấp
        public DateTime? CitizenIdIssuedDate { get; set; }

        // Nơi cấp
        [MaxLength(255)]
        public string? CitizenIdIssuedPlace { get; set; }


        // =========================================================
        // THÔNG TIN LIÊN HỆ
        // =========================================================

        [MaxLength(20)]
        public string? PhoneNumber { get; set; }

        [EmailAddress]
        [MaxLength(150)]
        public string? Email { get; set; }


        // =========================================================
        // ĐỊA CHỈ
        // =========================================================

        public string? PermanentAddress { get; set; }

        public string? CurrentAddress { get; set; }


        // =========================================================
        // TÀI KHOẢN ĐĂNG NHẬP - OPTIONAL
        // =========================================================

        // Nếu nhân viên có tài khoản user trong hệ thống
        public Guid? UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public virtual ApplicationUser? User { get; set; }


        // =========================================================
        // CÔNG VIỆC
        // =========================================================

        // Phòng ban
        public Guid? DepartmentId { get; set; }

        [ForeignKey(nameof(DepartmentId))]
        public virtual Department? Department { get; set; }


        // Chức vụ
        public Guid? PositionId { get; set; }

        [ForeignKey(nameof(PositionId))]
        public virtual Position? Position { get; set; }


        // Quản lý trực tiếp (nếu có)
        public Guid? ManagerId { get; set; }

        [ForeignKey(nameof(ManagerId))]
        public virtual Employee? Manager { get; set; }


        // =========================================================
        // THỜI GIAN LÀM VIỆC
        // =========================================================

        public DateTime? StartDate { get; set; }

        public DateTime? ProbationEndDate { get; set; }


        // =========================================================
        // LOẠI NHÂN VIÊN / TRẠNG THÁI
        // =========================================================

        public LaborType LaborType { get; set; } = LaborType.FullTime;

        public EmployeeStatus Status { get; set; } = EmployeeStatus.Probation;


        // =========================================================
        // CHẤM CÔNG
        // =========================================================

        // Sử dụng chấm công qua điện thoại hay không
        public bool UsePhoneAttendance { get; set; } = false;


        // =========================================================
        // GHI CHÚ
        // =========================================================

        public string? Note { get; set; }


        // =========================================================
        // QUAN HỆ
        // =========================================================

        // Danh sách nhân viên trực thuộc (subordinates)
        public virtual ICollection<Employee> Subordinates { get; set; }
            = new List<Employee>();

        // Hợp đồng của nhân viên
        public virtual ICollection<EmployeeContract> Contracts { get; set; }
            = new List<EmployeeContract>();

        // Lịch sử lương
        public virtual ICollection<EmployeeSalary> Salaries { get; set; }
            = new List<EmployeeSalary>();

        // Thông tin bảo hiểm
        public virtual ICollection<EmployeeInsurance> Insurances { get; set; }
            = new List<EmployeeInsurance>();

        // Tài khoản ngân hàng của nhân viên
        public virtual ICollection<EmployeeBankAccount> BankAccounts { get; set; }
            = new List<EmployeeBankAccount>();

        // Người phụ thuộc
        public virtual ICollection<EmployeeDependent> Dependents { get; set; }
            = new List<EmployeeDependent>();

        // Bản ghi chấm công
        public virtual ICollection<Attendance> Attendances { get; set; }
            = new List<Attendance>();

        // Yêu cầu nghỉ phép
        public virtual ICollection<LeaveRequest> LeaveRequests { get; set; }
            = new List<LeaveRequest>();

        // Yêu cầu tăng ca
        public virtual ICollection<OvertimeRequest> OvertimeRequests { get; set; }
            = new List<OvertimeRequest>();

        // Sổ giao dịch phép
        public virtual ICollection<LeaveLedger> LeaveLedgers { get; set; }
            = new List<LeaveLedger>();

        // Yêu cầu sửa công
        public virtual ICollection<AttendanceCorrection> AttendanceCorrections { get; set; }
            = new List<AttendanceCorrection>();

        // Bảng lương liên quan
        public virtual ICollection<Payroll> Payrolls { get; set; }
            = new List<Payroll>();
    }


    // =============================================================
    // ENUMS
    // =============================================================

    // Loại lao động
    public enum LaborType
    {
        FullTime = 1,      // Nhân viên chính thức
        PartTime = 2,      // Nhân viên bán thời gian
        Intern = 3,        // Thực tập sinh
        Freelancer = 4     // Cộng tác viên / Freelancer
    }

    // Trạng thái làm việc của nhân viên
    public enum EmployeeStatus
    {
        Probation = 1,     // Đang thử việc
        Working = 2,       // Đang làm
        OnLeave = 3,       // Tạm nghỉ
        Resigned = 4,      // Đã nghỉ việc
        Terminated = 5     // Chấm dứt hợp đồng
    }

    // Giới tính
    public enum GenderType
    {
        RatherNotSay = 0,
        Male = 1,
        Female = 2
    }
}
