param(
  [Parameter(Mandatory = $true)]
  [string]$Owner,

  [Parameter(Mandatory = $true)]
  [string]$Repo,

  [string]$Branch = "main",

  [string]$PolicyFile = ".github/policies/branch-protection-main.json"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "GitHub CLI (gh) is required."
}

if (-not (Test-Path $PolicyFile)) {
  throw "Policy file not found: $PolicyFile"
}

gh api `
  -X PUT `
  "repos/$Owner/$Repo/branches/$Branch/protection" `
  -H "Accept: application/vnd.github+json" `
  --input $PolicyFile | Out-Null

Write-Host "Branch protection applied on $Owner/$Repo@$Branch"
