#!/usr/bin/env bash
# Lighthouse runs (R1a bundle transfer, R1b Core Web Vitals) for both apps.
# Usage: bench/lighthouse.sh [runs]  (default 5)
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

runs=${1:-5}

# Use Playwright's Chromium when no system Chrome is available.
if [[ -z "${CHROME_PATH:-}" ]]; then
  pw_chrome=$(fd -d 3 'Google Chrome for Testing.app' "$HOME/Library/Caches/ms-playwright" | head -1)
  if [[ -n "$pw_chrome" ]]; then
    export CHROME_PATH="$pw_chrome/Contents/MacOS/Google Chrome for Testing"
  fi
fi
# /profile is auth-gated (localStorage token, which Lighthouse cannot inject) and excluded.
routes=(/ /challenges /scores)
mkdir -p bench/results

median() {
  sort -n | awk '{a[NR]=$1} END {print (NR%2 ? a[(NR+1)/2] : (a[NR/2]+a[NR/2+1])/2)}'
}

for app in v1:4173 v2:4174; do
  name=${app%%:*}
  port=${app##*:}
  for route in "${routes[@]}"; do
    slug=$(echo "$route" | tr -s '/' '-' | sed 's/^-$/home/;s/^-//')
    lcp=() tbt=() cls=() bytes=()
    for i in $(seq 1 "$runs"); do
      out="bench/results/lh-$name-$slug-$i.json"
      bunx lighthouse "http://localhost:$port$route" \
        --preset desktop --quiet --output json --output-path "$out" \
        --only-categories performance \
        --chrome-flags='--headless=new' >/dev/null 2>&1
      lcp+=("$(bun -e "const r=await Bun.file('$out').json();console.log(r.audits['largest-contentful-paint'].numericValue)")")
      tbt+=("$(bun -e "const r=await Bun.file('$out').json();console.log(r.audits['total-blocking-time'].numericValue)")")
      cls+=("$(bun -e "const r=await Bun.file('$out').json();console.log(r.audits['cumulative-layout-shift'].numericValue)")")
      bytes+=("$(bun -e "const r=await Bun.file('$out').json();console.log(r.audits['total-byte-weight'].numericValue)")")
    done
    m_lcp=$(printf '%s\n' "${lcp[@]}" | median)
    m_tbt=$(printf '%s\n' "${tbt[@]}" | median)
    m_cls=$(printf '%s\n' "${cls[@]}" | median)
    m_bytes=$(printf '%s\n' "${bytes[@]}" | median)
    echo "$name $route lcp_ms=$m_lcp tbt_ms=$m_tbt cls=$m_cls transfer_bytes=$m_bytes"
  done
done
