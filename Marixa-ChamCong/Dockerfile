# Build stage (API .NET)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY M.BE.sln ./
COPY M.API/ M.API/
COPY M.Core/ M.Core/
COPY M.Contract.Repositories/ M.Contract.Repositories/
COPY M.Contract.Serivces/ M.Contract.Serivces/
COPY M.ModelViews/ M.ModelViews/
COPY M.Repositories/ M.Repositories/
COPY M.Services/ M.Services/

RUN dotnet publish M.API/M.API.csproj -c Release -o /app

# Build stage (React frontend - Vite)
# Build mới UI từ code GitHub trong mỗi lần deploy -> luôn là giao diện mới nhất.
# Kết quả (dist) được copy đè lên /app/wwwroot của API ở stage runtime.
FROM node:20-alpine AS web
WORKDIR /web
COPY ChamCong/package.json ChamCong/package-lock.json ./
RUN npm install --no-audit --no-fund
COPY ChamCong/ ./
RUN npm run build

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .

# UI React build mới đè lên wwwroot (API serve SPA + SPA fallback index.html).
# Ảnh chấm công: PhotoStore tạo /app/wwwroot/uploads (nằm SAU wwwroot build).
COPY --from=web /web/dist ./wwwroot/
RUN mkdir -p wwwroot/uploads/attendance/checkin wwwroot/uploads/attendance/checkout

# Dockerfile TZ = giờ Việt Nam để DateTime.Now (ngày chấm công AttendanceDate,
# tháng upload ảnh yyyyMM) đúng múi giờ VN; UtcNow vẫn viết UTC vào DB chuẩn.
ENV TZ=Asia/Ho_Chi_Minh

# Render injects the PORT env var (default 10000). Bind Kestrel via the modern
# ASPNETCORE_HTTP_PORTS var and clear the legacy HTTP_PORTS/HTTPS_PORTS vars the
# base image sets, so Kestrel does NOT log an "Overriding HTTP_PORTS 8080" warning.
CMD ["sh", "-c", "unset HTTP_PORTS HTTPS_PORTS; export ASPNETCORE_HTTP_PORTS=${PORT:-10000}; exec dotnet M.API.dll"]
