$ErrorActionPreference = 'Stop'
$serverRoot = Split-Path $PSScriptRoot -Parent
$outputDir = Join-Path $serverRoot 'data\ruc'
$workRoot = Join-Path ([IO.Path]::GetTempPath()) ('regalos-ruc-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $workRoot -Force | Out-Null
try {
    $page = (Invoke-WebRequest -UseBasicParsing -Uri 'https://www.dnit.gov.py/web/portal-institucional/listado-de-ruc-con-sus-equivalencias' -TimeoutSec 60).Content
    $dates = [regex]::Matches($page, 'Actualizado al\s+(\d{1,2}-\d{1,2}-\d{2,4})') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
    if (@($dates).Count -ne 1) { throw 'No se pudo determinar una fecha consistente del padrón DNIT.' }
    foreach ($digit in 0..9) {
        $pattern = 'href="([^"]*ruc' + $digit + '\.zip[^"]*)"'
        $match = [regex]::Match($page, $pattern)
        if (!$match.Success) { throw "Falta el archivo oficial ruc$digit.zip" }
        $link = [Net.WebUtility]::HtmlDecode($match.Groups[1].Value)
        $uri = [uri]::new([uri]'https://www.dnit.gov.py', $link)
        if ($uri.Host -ne 'www.dnit.gov.py') { throw 'Origen de descarga inesperado.' }
        $zip = Join-Path $workRoot "ruc$digit.zip"
        Write-Output "Descargando grupo RUC $digit de DNIT..."
        Invoke-WebRequest -UseBasicParsing -Uri $uri -OutFile $zip -TimeoutSec 120
        Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $workRoot "$digit") -Force
    }
    & node (Join-Path $PSScriptRoot 'build-ruc.cjs') $workRoot $outputDir $dates
    if ($LASTEXITCODE -ne 0) { throw 'La importación no se completó. El padrón anterior se conserva.' }
    Write-Output 'Padrón completo actualizado. Los diez grupos se consultan localmente.'
} finally {
    $resolvedWork = [IO.Path]::GetFullPath($workRoot)
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if ($resolvedWork.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -and (Split-Path $resolvedWork -Leaf).StartsWith('regalos-ruc-')) {
        Remove-Item -LiteralPath $resolvedWork -Recurse -Force
    }
}
