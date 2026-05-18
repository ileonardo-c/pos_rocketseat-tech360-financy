#!/usr/bin/env bash
set -euo pipefail

OWNER="${1:?owner required}"
REPO="${2:?repo required}"
BRANCH="${3:-main}"
POLICY_FILE="${4:-.github/policies/branch-protection-main.json}"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required." >&2
  exit 1
fi

if [ ! -f "$POLICY_FILE" ]; then
  echo "Policy file not found: $POLICY_FILE" >&2
  exit 1
fi

gh api -X PUT \
  "repos/$OWNER/$REPO/branches/$BRANCH/protection" \
  -H "Accept: application/vnd.github+json" \
  --input "$POLICY_FILE"

echo "Branch protection applied on $OWNER/$REPO@$BRANCH"
