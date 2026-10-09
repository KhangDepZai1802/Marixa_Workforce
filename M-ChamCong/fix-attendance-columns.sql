-- Them 3 cot vao bang Attendances (fix schema drift)
-- Chay: SSMS -> Monica_001 -> New Query

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Attendances' AND COLUMN_NAME = 'CheckInTime'
)
BEGIN
    ALTER TABLE dbo.Attendances ADD
        CheckInTime    datetimeoffset NULL,
        CheckOutTime   datetimeoffset NULL,
        ChangeSummary  nvarchar(500)   NULL;
END;

GO
-- Verify
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Attendances'
  AND COLUMN_NAME IN ('CheckInTime','CheckOutTime','ChangeSummary')
ORDER BY COLUMN_NAME;
