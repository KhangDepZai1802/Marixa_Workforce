using M.Contract.Repositories.IUOW;
using M.Repositories.UOW;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace M.Services
{
    public static class DependencyInjection
    {
        public static void AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddRepositories();
        }
        public static void AddRepositories(this IServiceCollection services)
        {
            services.AddScoped<IUnitOfWork, UnitOfWork>();
        }
    }
}
