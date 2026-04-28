param(
  [ValidateSet('static','ssr')]
  [string]$mode = 'static'
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$proj = Resolve-Path (Join-Path $root '..')
Set-Location $proj

function Write-Info($msg){ Write-Host "[info] $msg" -ForegroundColor Cyan }

if ($mode -eq 'static') {
  Write-Info 'Switching to STATIC export mode'
  # write firebase.json for static hosting
  @'
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
'@ | Set-Content -Encoding UTF8 firebase.json

  # copy static next config
  Copy-Item -Force .\next.static.config.js .\next.config.js
  Write-Info 'Static config applied. Build with: npm run export'
}
else {
  Write-Info 'Switching to SSR mode'
  # write firebase.json for frameworks backend (SSR)
  @'
{
  "hosting": {
    "source": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "frameworksBackend": { "region": "asia-east1" }
  }
}
'@ | Set-Content -Encoding UTF8 firebase.json

  # regenerate next.config.js for SSR minimal (no export)
  @"
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true, domains: [] },
};
module.exports = nextConfig;
"@ | Set-Content -Encoding UTF8 next.config.js
  Write-Info 'SSR config applied. Deploy with: firebase hosting:channel:deploy ...'
}


