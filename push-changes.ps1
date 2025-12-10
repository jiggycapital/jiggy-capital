# Git Push Script for v58.0 Changes
Write-Host "=== Staging files ===" -ForegroundColor Cyan
git add script.js index.html utils.js ANALYSIS_CHECKLIST.md IMPROVEMENTS_SUMMARY.md CHANGELOG.md DEPLOY_INSTRUCTIONS.md

Write-Host "`n=== Checking status ===" -ForegroundColor Cyan
git status --short

Write-Host "`n=== Committing changes ===" -ForegroundColor Cyan
git commit -m "v58.0: Performance and Security Improvements - Parallel API calls, XSS protection, chart optimizations"

Write-Host "`n=== Latest commit ===" -ForegroundColor Cyan
git log --oneline -1

Write-Host "`n=== Pushing to GitHub ===" -ForegroundColor Cyan
git push origin master

Write-Host "`n=== Done! ===" -ForegroundColor Green

