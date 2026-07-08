#!/usr/bin/env bash
# Static "leaner codebase" metrics for the v1 (apps/web) vs v2 (apps/web-new) comparison.
# Fair-LOC methodology: source lines under src/ excluding lines inside <style> blocks,
# .css files, and tests (v2's tests/ lives outside src/ so it is excluded structurally).
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

loc_total() {
  fd -e svelte -e ts -e html . "apps/$1/src" -E node_modules -X cat | wc -l | tr -d ' '
}

file_count() {
  fd -e svelte -e ts -e css -e html . "apps/$1/src" -E node_modules | wc -l | tr -d ' '
}

style_block_lines() {
  fd -e svelte . "apps/$1/src" \
    -x awk '/<style/{s=1} s{c++} /<\/style>/{s=0} END{print c+0}' {} |
    awk '{t+=$1} END {print t+0}'
}

css_lines() {
  fd -e css . "apps/$1/src" -X cat | wc -l | tr -d ' '
}

prod_dep_count() {
  bun -e "const p = await Bun.file('apps/$1/package.json').json(); \
console.log(Object.keys(p.dependencies ?? {}).length)"
}

node_modules_size() {
  du -sh "apps/$1/node_modules" 2>/dev/null | cut -f1 || echo 'n/a'
}

timed_build() {
  local start end
  start=$(date +%s)
  (cd "apps/$1" && bun run build) >/dev/null 2>&1
  end=$(date +%s)
  echo "$((end - start))s"
}

measure() {
  local app=$1
  local styles css raw fair
  styles=$(style_block_lines "$app")
  css=$(css_lines "$app")
  raw=$(($(loc_total "$app") + css))
  fair=$((raw - styles - css))
  echo "$raw $((styles + css)) $fair" \
    "$(file_count "$app") $(prod_dep_count "$app") $(node_modules_size "$app")"
}

read -r v1_raw v1_style v1_fair v1_files v1_deps v1_nm <<<"$(measure web)"
read -r v2_raw v2_style v2_fair v2_files v2_deps v2_nm <<<"$(measure web-new)"

echo '| Metric | v1 (web) | v2 (web-new) |'
echo '|---|---|---|'
echo "| Raw src lines | $v1_raw | $v2_raw |"
echo "| Styling lines (style blocks + css) | $v1_style | $v2_style |"
echo "| Fair LOC (non-style, non-test) | $v1_fair | $v2_fair |"
echo "| Source files | $v1_files | $v2_files |"
echo "| Prod dependencies | $v1_deps | $v2_deps |"
echo "| node_modules size | $v1_nm | $v2_nm |"

if [[ "${1:-}" == "--build" ]]; then
  echo "| Cold prod build time | $(timed_build web) | $(timed_build web-new) |"
fi
