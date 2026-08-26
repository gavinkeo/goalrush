Write-Host "EURO GOAL RUSH - Crest Importer" -ForegroundColor Cyan
Write-Host ""

if (-not $env:API_FOOTBALL_KEY) {
    $secure = Read-Host "Enter API-Football key" -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        $env:API_FOOTBALL_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

node .\fetch-crests.mjs

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Done. Refresh the site after committing competition.json." -ForegroundColor Green
}
