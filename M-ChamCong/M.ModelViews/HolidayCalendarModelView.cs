using M.Contract.Repositories.Entities;
using System.ComponentModel.DataAnnotations;

namespace ModelViews.HolidayCalendarModelView
{
    public class HolidayCalendarResponseModelView
    {
        public Guid Id { get; set; }

        public DateTime Date { get; set; }

        public int Year { get; set; }

        public HolidayType Type { get; set; }

        public string? Name { get; set; }

        public bool IsActive { get; set; }

        public DateTimeOffset CreatedTime { get; set; }

        public DateTimeOffset LastUpdatedTime { get; set; }
    }


    public class CreateHolidayCalendarModelView
    {
        [Required]
        public DateTime Date { get; set; }

        public int Year { get; set; }

        [Required]
        public HolidayType Type { get; set; }

        [MaxLength(150)]
        public string? Name { get; set; }

        public bool IsActive { get; set; } = true;
    }


    public class UpdateHolidayCalendarModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public DateTime Date { get; set; }

        public int Year { get; set; }

        [Required]
        public HolidayType Type { get; set; }

        [MaxLength(150)]
        public string? Name { get; set; }

        public bool IsActive { get; set; }
    }
}
