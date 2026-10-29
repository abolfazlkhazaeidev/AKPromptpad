param(
    [Parameter(Mandatory=$true, HelpMessage="Your GitHub repository URL, e.g. https://github.com/yourusername/AKPromptpad.git")]
    [string]$RemoteUrl
)

$ErrorActionPreference = "Stop"

Write-Host "==> Configuring Git remote 'origin' -> $RemoteUrl" -ForegroundColor Cyan
if (git remote | Select-String -Pattern "^origin$") {
    git remote set-url origin $RemoteUrl
} else {
    git remote add origin $RemoteUrl
}

Write-Host "==> Pushing 'main' branch and all commit history..." -ForegroundColor Cyan
git branch -M main
git push -u origin main

Write-Host "==> Pushing Semantic Version tags (v0.1.0, v0.2.0, v0.3.0, v1.0.0)..." -ForegroundColor Cyan
git push origin --tags

Write-Host "`n[SUCCESS] AKPromptpad repository and release tags are now live on GitHub!" -ForegroundColor Green
