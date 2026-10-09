using Microsoft.AspNetCore.Mvc.Filters;

namespace M.API.Filters
{
    /// <summary>
    /// ASP.NET Core action filter that normalizes ALL DateTime / DateTime?
    /// properties on every bound controller action parameter to Kind = Utc
    /// before the action executes.
    ///
    /// Why: PostgreSQL (Npgsql) requires DateTime Kind=Utc for timestamptz
    /// columns. Client-supplied date strings ("2026-10-08") deserialize to
    /// Kind=Unspecified; if used as a query parameter or entity property,
    /// Npgsql throws ArgumentException at execution time.
    ///
    /// This filter is a no-op on local SQL Server (which ignores Kind) and
    /// covers ALL controllers and ALL actions in one place — no per-method
    /// patching needed.
    /// </summary>
    public class DateTimeUtcKindFilter : IActionFilter
    {
        public void OnActionExecuting(ActionExecutingContext context)
        {
            foreach (var argument in context.ActionArguments.Values)
            {
                if (argument == null) continue;
                NormalizeDateTimeKind(argument);
            }
        }

        public void OnActionExecuted(ActionExecutedContext context) { }

        private static void NormalizeDateTimeKind(object model)
        {
            foreach (var prop in model.GetType().GetProperties())
            {
                if (!prop.CanWrite) continue;

                if (prop.PropertyType == typeof(DateTime))
                {
                    var val = (DateTime)prop.GetValue(model)!;
                    if (val.Kind != DateTimeKind.Utc)
                    {
                        // Date-only values (midnight) are UTC dates (from JS .toISOString().slice(0,10)).
                        // Timestamp values are treated as local time → convert to UTC.
                        var utc = IsDateOnly(val)
                            ? DateTime.SpecifyKind(val, DateTimeKind.Utc)
                            : val.ToUniversalTime();
                        prop.SetValue(model, utc);
                    }
                }
                else if (prop.PropertyType == typeof(DateTime?))
                {
                    var val = (DateTime?)prop.GetValue(model);
                    if (val.HasValue && val.Value.Kind != DateTimeKind.Utc)
                    {
                        var utc = IsDateOnly(val.Value)
                            ? DateTime.SpecifyKind(val.Value, DateTimeKind.Utc)
                            : val.Value.ToUniversalTime();
                        prop.SetValue(model, utc);
                    }
                }
            }
        }

        /// <summary>
        /// A DateTime with midnight time (00:00:00) is treated as a date-only value
        /// (represents a UTC date from the client's .toISOString().slice(0,10)).
        /// A DateTime with any time component is a timestamp (local time → UTC).
        /// </summary>
        private static bool IsDateOnly(DateTime dt) =>
            dt.TimeOfDay == TimeSpan.Zero;
    }
}
