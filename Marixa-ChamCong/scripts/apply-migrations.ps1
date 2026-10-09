$ErrorActionPreference = 'Stop'
$databaseUrl = [System.Environment]::GetEnvironmentVariable('MARIXA_DATABASE_URL')
if ([string]::IsNullOrWhiteSpace($databaseUrl)) { throw 'Set MARIXA_DATABASE_URL to the Supabase dev PostgreSQL connection string first.' }
$psql = Get-Command psql -ErrorAction Stop
$migrationDir = Join-Path $PSScriptRoot '..\supabase\migrations'
& $psql.Source $databaseUrl '-v' 'ON_ERROR_STOP=1' '-c' 'CREATE TABLE IF NOT EXISTS public.app_schema_migrations (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now());'
if ($LASTEXITCODE -ne 0) { throw 'Could not initialize the migration history table.' }
foreach ($file in (Get-ChildItem -LiteralPath $migrationDir -Filter '*.sql' -File | Sort-Object Name)) {
  $version = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
  $checksum = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  $known = (& $psql.Source $databaseUrl '-v' 'ON_ERROR_STOP=1' '-tAc' "SELECT checksum FROM public.app_schema_migrations WHERE version='$version';").Trim()
  if ($LASTEXITCODE -ne 0) { throw "Could not read migration history for $version." }
  if ($known) {
    if ($known -ne $checksum) { throw "Applied migration $version has changed. Add a new migration instead of editing it." }
    Write-Output "Already applied: $version"
    continue
  }
  & $psql.Source $databaseUrl '-v' 'ON_ERROR_STOP=1' '--single-transaction' '-v' "migration_version=$version" '-v' "migration_checksum=$checksum" '-f' $file.FullName '-c' "INSERT INTO public.app_schema_migrations(version,checksum) VALUES (:'migration_version', :'migration_checksum');"
  if ($LASTEXITCODE -ne 0) { throw "Migration failed and was rolled back: $version" }
  Write-Output "Applied: $version"
}
