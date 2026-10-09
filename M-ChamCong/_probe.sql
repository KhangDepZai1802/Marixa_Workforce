SELECT 'TABLE' AS kind, name FROM sys.tables WHERE name IN ('WorkTasks','WorkTaskComments','WorkPerformances')
UNION ALL
SELECT 'HISTORY', MigrationId FROM __EFMigrationsHistory WHERE MigrationId LIKE '%WorkTask%'
ORDER BY kind;
GO
SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME 
FROM INFORMATION_SCHEMA.KEY_COLUMN_usage k
WHERE k.TABLE_NAME IN ('WorkTasks','WorkPerformances') AND k.CONSTRAINT_NAME LIKE 'FK%';
