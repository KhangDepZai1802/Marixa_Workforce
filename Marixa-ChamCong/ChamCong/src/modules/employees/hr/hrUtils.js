// ===== Tiện ích CSV / Excel =====
const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

export const toCsv = (rows, headers) => {
    const lines = [headers.map(esc).join(",")];
    rows.forEach((r) =>
        lines.push(headers.map((h) => esc(r[h])).join(","))
    );
    // BOM UTF-8 để Excel đọc tiếng Việt đúng
    return "\uFEFF" + lines.join("\n");
};

export const downloadCsv = (filename, content) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

export const downloadExcel = async (filename, rows) => {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Nhân viên");
    sheet.addRow(HR_CSV_HEADERS);
    rows.forEach((row) => sheet.addRow(HR_COLUMNS.map(([key]) => row[key] ?? "")));
    const blob = new Blob([await workbook.xlsx.writeBuffer()], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

// Một schema dùng chung cho tiêu đề, mẫu, xuất file và nhập file.
export const HR_COLUMNS = [
    ["EmployeeCode", "Mã nhân viên"],
    ["GivenName", "Họ / tên đệm"],
    ["FamilyName", "Tên"],
    ["BirthDate", "Ngày sinh"],
    ["Gender", "Giới tính"],
    ["CitizenId", "CCCD / CMT"],
    ["CitizenIdIssuedDate", "Ngày cấp CCCD / CMT"],
    ["CitizenIdIssuedPlace", "Nơi cấp CCCD / CMT"],
    ["PhoneNumber", "Điện thoại"],
    ["Email", "Email"],
    ["PermanentAddress", "Địa chỉ thường trú"],
    ["CurrentAddress", "Địa chỉ hiện tại"],
    ["DepartmentName", "Phòng ban"],
    ["PositionName", "Chức vụ"],
    ["StartDate", "Ngày vào làm"],
    ["ProbationEndDate", "Ngày kết thúc thử việc"],
    ["LaborType", "Loại lao động"],
    ["Status", "Trạng thái"],
    ["UsePhoneAttendance", "Chấm công qua điện thoại"],
    ["ContractNumber", "Số hợp đồng"],
    ["ContractType", "Loại hợp đồng"],
    ["ContractStart", "Ngày ký hợp đồng"],
    ["ContractEnd", "Ngày hết hạn hợp đồng"],
    ["BasicSalary", "Lương cơ bản"],
    ["PaymentType", "Hình thức trả lương"],
    ["PositionAllowance", "Phụ cấp chức vụ"],
    ["OtherAllowance", "Phụ cấp khác"],
    ["SocialInsuranceNumber", "Số BHXH"],
    ["PersonalTaxCode", "Mã số thuế cá nhân"],
    ["IsSocialInsuranceParticipant", "Tham gia BHXH"],
    ["BankName", "Ngân hàng"],
    ["AccountNumber", "Số tài khoản"],
    ["Note", "Ghi chú"],
    ["EndWorkDate", "Ngày kết thúc làm việc"],
    ["EndWorkReason", "Lý do kết thúc làm việc"],
];
export const HR_CSV_HEADERS = HR_COLUMNS.map(([, label]) => label);
export const HR_HEADER_BY_KEY = Object.fromEntries(HR_COLUMNS);

export const hrTemplate = () => [
    {
                EmployeeCode: "NV001",
                GivenName: "Nguyễn Văn",
                FamilyName: "An",
                BirthDate: "1995-01-15",
                Gender: "Nam",
                CitizenId: "",
                CitizenIdIssuedDate: "",
                CitizenIdIssuedPlace: "",
                Email: "van.nguyen@congty.vn",
                PhoneNumber: "0900000000",
                PermanentAddress: "",
                CurrentAddress: "",
                DepartmentName: "IT",
                PositionName: "Developer",
                StartDate: "2026-01-01",
                ProbationEndDate: "",
                LaborType: 1,
                Status: 1,
                UsePhoneAttendance: "Không",
                ContractNumber: "",
                ContractType: 1,
                ContractStart: "",
                ContractEnd: "",
                BasicSalary: "",
                PaymentType: 1,
                PositionAllowance: "",
                OtherAllowance: "",
                SocialInsuranceNumber: "",
                PersonalTaxCode: "",
                IsSocialInsuranceParticipant: "Không",
                BankName: "",
                AccountNumber: "",
                Note: "",
                EndWorkDate: "",
                EndWorkReason: "",
    },
];

// Xuất danh sách (đã lọc) ra CSV. salaryMap: Map(employeeId -> lương cơ bản).
export const exportEmployees = (employees, data) => {
    const byEmployee = (items, employeeId) =>
        items?.find((item) => item.employeeId === employeeId) || {};
    const rows = employees.map((e) => {
        const contract = byEmployee(data.contracts, e.id);
        const salary = byEmployee(data.salaries, e.id);
        const insurance = byEmployee(data.insurance, e.id);
        const bankAccount = byEmployee(data.bankAccounts, e.id);
        return {
            EmployeeCode: e.employeeCode,
            GivenName: e.givenName,
            FamilyName: e.familyName,
            BirthDate: e.birthDate?.slice(0, 10),
            Gender: ({ 0: "Không tiết lộ", 1: "Nam", 2: "Nữ" })[e.gender] || "Không tiết lộ",
            CitizenId: e.citizenId,
            CitizenIdIssuedDate: e.citizenIdIssuedDate?.slice(0, 10),
            CitizenIdIssuedPlace: e.citizenIdIssuedPlace,
            PhoneNumber: e.phoneNumber,
            Email: e.email,
            PermanentAddress: e.permanentAddress,
            CurrentAddress: e.currentAddress,
            DepartmentName: e.departmentName,
            PositionName: e.positionName,
            StartDate: e.startDate?.slice(0, 10),
            ProbationEndDate: e.probationEndDate?.slice(0, 10),
            LaborType: e.laborType,
            Status: e.status,
            UsePhoneAttendance: e.usePhoneAttendance ? "Có" : "Không",
            ContractNumber: contract.contractNumber,
            ContractType: contract.contractType,
            ContractStart: contract.startDate?.slice(0, 10),
            ContractEnd: contract.endDate?.slice(0, 10),
            BasicSalary: salary.basicSalary,
            PaymentType: salary.paymentType,
            PositionAllowance: salary.positionAllowance,
            OtherAllowance: salary.otherAllowance,
            SocialInsuranceNumber: insurance.socialInsuranceNumber,
            PersonalTaxCode: insurance.personalTaxCode,
            IsSocialInsuranceParticipant: insurance.isSocialInsuranceParticipant ? "Có" : "Không",
            BankName: bankAccount.bankName,
            AccountNumber: bankAccount.accountNumber,
            Note: e.note,
            EndWorkDate: "",
            EndWorkReason: "",
        };
    });
    return rows;
};

export const readExcel = async (file) => {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const rows = [];
    workbook.worksheets[0]?.eachRow((row) => {
        rows.push(row.values.slice(1).map((value) => {
            const cell = value && typeof value === "object" && !(value instanceof Date)
                ? value.text ?? value.result ?? ""
                : value;
            return cell instanceof Date ? cell.toISOString().slice(0, 10) : cell ?? "";
        }));
    });
    return rows;
};

// Đọc CSV (tách đúng dấu phẩy trong ngoặc kép) -> mảng mảng hàng.
export const parseCsv = (text) => {
    const rows = [];
    let row = [];
    let cur = "";
    let inQ = false;
    const src = text.replace(/^\uFEFF/, "");
    for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (inQ) {
            if (c === '"') {
                if (src[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else inQ = false;
            } else cur += c;
        } else if (c === '"') inQ = true;
        else if (c === ",") {
            row.push(cur);
            cur = "";
        } else if (c === "\n") {
            row.push(cur);
            cur = "";
            rows.push(row);
            row = [];
        } else if (c !== "\r") cur += c;
    }
    if (cur !== "" || row.length) {
        row.push(cur);
        rows.push(row);
    }
    return rows.filter((r) => r.some((x) => String(x).trim() !== ""));
};

// ===== Độ hoàn thiện hồ sơ (7 nhóm, theo dữ liệu thật) =====
export const docCompleteness = (e, data) => {
    const has = (arr) => arr.some((x) => x.employeeId === e.id);
    const items = [
        { key: "danh tính", done: !!(e.citizenId || e.citizenIdNumber) },
        { key: "pháp lý", done: !!e.citizenId },
        { key: "liên hệ", done: !!(e.email || e.phoneNumber) },
        { key: "điều kiện", done: !!e.status },
        { key: "hợp đồng", done: has(data.contracts) },
        { key: "lương&chế độ", done: has(data.salaries) },
        {
            key: "bảo hiểm&thue",
            done: has(data.insurance),
        },
        { key: "thanh toán", done: has(data.bankAccounts) },
    ];
    const done = items.filter((i) => i.done).length;
    const missing = items.filter((i) => !i.done).map((i) => i.key);
    return {
        percent: Math.round((done / items.length) * 100),
        missing,
    };
};
