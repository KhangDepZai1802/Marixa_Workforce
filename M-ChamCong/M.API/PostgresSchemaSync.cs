using System.Data;
using System.Data.Common;
using M.Repositories.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace M.API;

/// <summary>
/// Generic PostgreSQL schema sync. Compares the current EF Core model to the
/// actual PostgreSQL schema and adds any missing columns (idempotent).
/// Runs on every app boot; safe to call repeatedly.
///
/// Uses raw ADO.NET (DbConnection/DbCommand) instead of EF SqlQueryRaw so
/// no EF query compilation happens (no EF1002 / 10103 warnings, no
/// "Value" alias wrapping pitfalls).
/// </summary>
public static class PostgresSchemaSync
{
    /// <summary>
    /// Ensure all columns defined in the EF model exist in PostgreSQL.
    /// Only adds missing columns; never drops or modifies existing ones.
    /// </summary>
    public static async Task EnsureColumnsAsync(this DatabaseContext db, IServiceProvider sp)
    {
        var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger("PostgresSchemaSync");

        var entityTypes = db.Model.GetEntityTypes()
            .Where(e => !e.IsOwned() && !string.IsNullOrEmpty(e.GetTableName()))
            .ToList();

        int tablesChecked = 0, columnsAdded = 0, tablesMissing = 0;

        var connection = db.Database.GetDbConnection();
        var openedHere = connection.State != ConnectionState.Open;
        if (openedHere)
        {
            await connection.OpenAsync();
        }

        try
        {
            foreach (var et in entityTypes)
            {
                var efTableName = et.GetTableName()!;

                // Resolve the actual PostgreSQL table name (case-insensitive match).
                // Npgsql quotes identifiers so the stored name may be PascalCase
                // ("Attendances") or lowercase, depending on how it was created.
                //
                // The identifier below comes from EF model metadata - never from
                // user input - so inlining it with single-quote doubling is safe.
                // We intentionally avoid "$1" parameter binding on the EF-owned
                // connection: mixing raw prepared statements with EF's session
                // state makes Npgsql raise 08P01 ("bind message supplies 0
                // parameters, but prepared statement requires 1") on startup.
                string? actualTable = await ScalarStringAsync(
                    connection,
                    "SELECT table_name FROM information_schema.tables " +
                    "WHERE table_schema = 'public' AND lower(table_name) = lower('" +
                    Escape(efTableName) + "') LIMIT 1");

                if (actualTable is null)
                {
                    tablesMissing++;
                    logger.LogWarning(
                        "PostgreSQL: table '{EfTable}' not found. If this is a new entity, " +
                        "delete the database and let EnsureCreated recreate it, or create it manually.",
                        efTableName);
                    continue;
                }

                tablesChecked++;

                // Get actual column names in this table.
                var actualColumns = await QueryStringsAsync(
                    connection,
                    "SELECT column_name FROM information_schema.columns " +
                    "WHERE table_schema = 'public' AND table_name = '" +
                    Escape(actualTable) + "'");

                var actualSet = actualColumns.ToHashSet(StringComparer.OrdinalIgnoreCase);

                // Compare with EF model properties; add anything missing.
                foreach (var prop in et.GetProperties())
                {
                    var colName = prop.GetColumnName();
                    if (string.IsNullOrEmpty(colName)) continue;

                    if (!actualSet.Contains(colName))
                    {
                        var pgType = MapToPostgresType(prop.ClrType);
                        // Identifiers below come from EF model metadata and
                        // information_schema - never from user input - so the
                        // interpolated DDL is safe.
                        using var cmd = connection.CreateCommand();
                        cmd.CommandText =
                            $"ALTER TABLE \"{actualTable}\" ADD COLUMN IF NOT EXISTS \"{colName}\" {pgType};";
                        await cmd.ExecuteNonQueryAsync();
                        columnsAdded++;
                        logger.LogInformation(
                            "PostgreSQL: added missing column {Table}.{Column} ({Type})",
                            actualTable, colName, pgType);
                    }
                }
            }
        }
        finally
        {
            if (openedHere)
            {
                await connection.CloseAsync();
            }
        }

        logger.LogInformation(
            "PostgreSQL schema sync complete: {Tables} tables checked, {Added} columns added, {Missing} tables missing.",
            tablesChecked, columnsAdded, tablesMissing);
    }

    /// <summary>
    /// Escape a trusted SQL string literal value by doubling single quotes.
    /// Only used with identifiers sourced from the EF model / information_schema,
    /// never from raw user input.
    /// </summary>
    private static string Escape(string value) => value.Replace("'", "''");

    private static async Task<string?> ScalarStringAsync(DbConnection connection, string sql)
    {
        using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        var result = await cmd.ExecuteScalarAsync();
        return result as string;
    }

    private static async Task<List<string>> QueryStringsAsync(DbConnection connection, string sql)
    {
        var list = new List<string>();
        using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(reader.GetString(0));
        }
        return list;
    }

    /// <summary>
    /// Maps a .NET CLR type to the equivalent PostgreSQL column type.
    /// Uses timestamptz for DateTime/DateTimeOffset to match Npgsql's default
    /// EnsureCreated DDL.
    /// </summary>
    private static string MapToPostgresType(Type type)
    {
        type = Nullable.GetUnderlyingType(type) ?? type;

        if (type == typeof(byte[])) return "bytea";
        if (type.IsArray && type != typeof(byte[])) return "text"; // fallback

        return type.Name switch
        {
            "Guid" => "uuid",
            "String" => "text",
            "Int32" => "integer",
            "Int64" => "bigint",
            "Int16" => "smallint",
            "UInt32" => "integer",
            "UInt64" => "bigint",
            "Double" => "double precision",
            "Single" => "real",
            "Decimal" => "numeric",
            "Boolean" => "boolean",
            "DateTime" => "timestamptz",
            "DateTimeOffset" => "timestamptz",
            "DateOnly" => "date",
            "TimeOnly" => "time",
            "TimeSpan" => "interval",
            _ => "text" // safe fallback
        };
    }
}
