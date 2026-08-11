# EduMind AI GitHub Upload Helper
# Run this script from the repository root after installing Git.
# It does NOT contain or ask for any GitHub password/token.

$ErrorActionPreference = "Stop"
$remote = "https://github.com/Lem0nade69/EduMindAI-Intelligent-Academic-Advisor.git"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git is not installed or not available in PATH."
    exit 1
}

if (-not (Test-Path ".git")) {
    git init
}

git branch -M main

$existing = git remote get-url origin 2>$null
if (-not $existing) {
    git remote add origin $remote
} elseif ($existing -ne $remote) {
    git remote set-url origin $remote
}

git add .
git status
git commit -m "Organize EduMind AI repository"
git push -u origin main

Write-Host ""
Write-Host "EduMind AI has been prepared for GitHub."
