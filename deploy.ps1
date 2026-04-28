cd $PSScriptRoot
Write-Host "Cleaning .firebase directory..." -ForegroundColor Cyan
Remove-Item -Recurse -Force .firebase -ErrorAction SilentlyContinue
Write-Host "Building Next.js application..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Deploying to Firebase..." -ForegroundColor Cyan
firebase deploy --only "hosting,firestore:rules"
if ($LASTEXITCODE -eq 0) {
    Write-Host "Deploy completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Deploy failed!" -ForegroundColor Red
    exit 1
}

