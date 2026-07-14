---
title: "Scoring providers"
description: "Choose how rCTF calculates point values for decay challenges."
order: 4
---
Scoring providers calculate point values for decay challenges. rCTF includes six algorithms that use solve counts, event timing, or both.

## Configuration

```yaml
scoreProvider:
  name: scores/classic # Default
```

Each challenge sets a point range via `<red>points.min</red>` and `<red>points.max</red>` in its data. The scoring provider calculates the current point value from the solve count and other context.

## Score context

All scoring providers receive a context object with:

| Field | Description |
| --- | --- |
| `<red>minPoints</red>` | Minimum points for the challenge (floor) |
| `<red>maxPoints</red>` | Maximum points for the challenge (ceiling, when 0 solves) |
| `<red>solves</red>` | Current number of solves |
| `<red>maxSolves</red>` | Maximum solves across all challenges (used by `<green>scores/legacy</green>`) |
| `<red>eventStartTime</red>` | Competition start time (used by `<green>scores/jammy</green>`) |
| `<red>eventEndTime</red>` | Competition end time (used by `<green>scores/jammy</green>`) |
| `<red>firstSolveTime</red>` | Time of the first solve for the challenge (used by `<green>scores/jammy</green>`) |

## Providers

Charts use a sample challenge with `<red>minPoints</red>: <green>100</green>` and `<red>maxPoints</red>: <green>500</green>`. Solve-based providers show the full provider family with the current tab highlighted, while `<green>scores/jammy</green>` uses its own time-based curve.

::::tabs
:::tab[scores/classic]

<figure style="margin:1.5rem 0;overflow:hidden;background:var(--background-l1);border-radius:var(--radius-lg)">
<svg viewBox="0 0 720 360" role="img" style="display:block;width:100%"><line x1="58" x2="696" y1="304" y2="304" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="308" text-anchor="end" fill="var(--muted-foreground)" font-size="11">0</text>
<line x1="58" x2="696" y1="248.8" y2="248.8" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="252.8" text-anchor="end" fill="var(--muted-foreground)" font-size="11">100</text>
<line x1="58" x2="696" y1="193.6" y2="193.6" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="197.6" text-anchor="end" fill="var(--muted-foreground)" font-size="11">200</text>
<line x1="58" x2="696" y1="138.4" y2="138.4" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="142.4" text-anchor="end" fill="var(--muted-foreground)" font-size="11">300</text>
<line x1="58" x2="696" y1="83.19999999999999" y2="83.19999999999999" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="87.19999999999999" text-anchor="end" fill="var(--muted-foreground)" font-size="11">400</text>
<line x1="58" x2="696" y1="28" y2="28" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="32" text-anchor="end" fill="var(--muted-foreground)" font-size="11">500</text>
<line x1="58" x2="58" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="58" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">0</text>
<line x1="185.60000000000002" x2="185.60000000000002" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="185.60000000000002" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">10</text>
<line x1="313.20000000000005" x2="313.20000000000005" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="313.20000000000005" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">20</text>
<line x1="440.8" x2="440.8" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="440.8" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">30</text>
<line x1="568.4000000000001" x2="568.4000000000001" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="568.4000000000001" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">40</text>
<line x1="696" x2="696" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="696" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">50</text>
<line x1="58" x2="58" y1="28" y2="304" stroke="var(--foreground)" stroke-width="1.5"/>
<line x1="58" x2="696" y1="304" y2="304" stroke="var(--foreground)" stroke-width="1.5"/>
<polyline points="58.00,28.00 70.76,28.00 83.52,40.14 96.28,51.18 109.04,61.67 121.80,70.50 134.56,78.78 147.32,86.51 160.08,93.69 172.84,100.86 185.60,106.94 198.36,113.01 211.12,118.53 223.88,124.05 236.64,129.02 249.40,133.98 262.16,138.40 274.92,142.82 287.68,147.23 300.44,151.10 313.20,154.96 325.96,158.82 338.72,162.14 351.48,166.00 364.24,169.31 377.00,172.62 389.76,175.94 402.52,178.70 415.28,182.01 428.04,184.77 440.80,187.53 453.56,190.29 466.32,193.05 479.08,195.26 491.84,198.02 504.60,200.78 517.36,202.98 530.12,205.19 542.88,207.40 555.64,210.16 568.40,212.37 581.16,214.02 593.92,216.23 606.68,218.44 619.44,220.65 632.20,222.30 644.96,224.51 657.72,226.17 670.48,228.38 683.24,230.03 696.00,231.69" fill="none" stroke="var(--tone-blue)" opacity=".35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<polyline points="58.00,28.00 70.76,28.00 83.52,59.46 96.28,83.20 109.04,101.42 121.80,116.32 134.56,128.46 147.32,138.40 160.08,146.68 172.84,154.41 185.60,160.48 198.36,166.00 211.12,170.97 223.88,175.38 236.64,179.25 249.40,182.56 262.16,185.87 274.92,188.63 287.68,191.39 300.44,193.60 313.20,195.81 325.96,198.02 338.72,199.67 351.48,201.33 364.24,202.98 377.00,204.64 389.76,206.30 402.52,207.40 415.28,208.50 428.04,209.61 440.80,210.71 453.56,211.82 466.32,212.92 479.08,214.02 491.84,214.58 504.60,215.68 517.36,216.23 530.12,217.34 542.88,217.89 555.64,218.44 568.40,219.54 581.16,220.10 593.92,220.65 606.68,221.20 619.44,221.75 632.20,222.30 644.96,222.86 657.72,223.41 670.48,223.96 683.24,224.51 696.00,224.51" fill="none" stroke="var(--tone-orange)" opacity=".35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<polyline points="58.00,28.00 70.76,28.00 83.52,28.00 96.28,304.00 109.04,304.00 121.80,304.00 134.56,304.00 147.32,304.00 160.08,304.00 172.84,304.00 185.60,304.00 198.36,304.00 211.12,304.00 223.88,304.00 236.64,304.00 249.40,304.00 262.16,304.00 274.92,304.00 287.68,304.00 300.44,304.00 313.20,304.00 325.96,304.00 338.72,304.00 351.48,304.00 364.24,304.00 377.00,304.00 389.76,304.00 402.52,304.00 415.28,304.00 428.04,304.00 440.80,304.00 453.56,304.00 466.32,304.00 479.08,304.00 491.84,304.00 504.60,304.00 517.36,304.00 530.12,304.00 542.88,304.00 555.64,304.00 568.40,304.00 581.16,304.00 593.92,304.00 606.68,304.00 619.44,304.00 632.20,304.00 644.96,304.00 657.72,304.00 670.48,304.00 683.24,304.00 696.00,304.00" fill="none" stroke="var(--tone-magenta)" opacity=".35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<polyline points="58.00,28.00 70.76,31.86 83.52,36.28 96.28,40.70 109.04,45.66 121.80,51.18 134.56,56.70 147.32,62.22 160.08,68.85 172.84,74.92 185.60,81.54 198.36,88.72 211.12,95.90 223.88,103.07 236.64,110.80 249.40,117.98 262.16,125.70 274.92,132.88 287.68,140.06 300.44,147.78 313.20,154.41 325.96,161.58 338.72,168.21 351.48,174.83 364.24,180.90 377.00,186.42 389.76,191.94 402.52,197.46 415.28,202.43 428.04,206.85 440.80,210.71 453.56,215.13 466.32,218.44 479.08,221.75 491.84,225.06 504.60,227.82 517.36,230.03 530.12,232.79 542.88,234.45 555.64,236.66 568.40,238.31 581.16,239.97 593.92,241.62 606.68,242.73 619.44,243.83 632.20,244.94 644.96,246.04 657.72,246.59 670.48,247.70 683.24,248.25 696.00,248.80" fill="none" stroke="var(--tone-green)" opacity=".35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<polyline points="58.00,28.00 70.76,28.00 83.52,38.49 96.28,51.18 109.04,63.33 121.80,74.92 134.56,85.41 147.32,95.34 160.08,104.18 172.84,112.46 185.60,119.63 198.36,126.81 211.12,132.88 223.88,138.95 236.64,143.92 249.40,148.89 262.16,153.86 274.92,157.72 287.68,161.58 300.44,165.45 313.20,168.76 325.96,171.52 338.72,174.83 351.48,177.59 364.24,179.80 377.00,182.56 389.76,184.77 402.52,186.98 415.28,188.63 428.04,190.84 440.80,192.50 453.56,194.15 466.32,195.81 479.08,197.46 491.84,198.57 504.60,200.22 517.36,201.33 530.12,202.98 542.88,204.09 555.64,205.19 568.40,206.30 581.16,207.40 593.92,207.95 606.68,209.06 619.44,210.16 632.20,210.71 644.96,211.82 657.72,212.37 670.48,213.47 683.24,214.02 696.00,214.58" fill="none" stroke="var(--tone-red)" opacity="1" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<text x="377" y="346" text-anchor="middle" fill="var(--muted-foreground)" font-size="12">Solves</text>
<text x="18" y="166" text-anchor="middle" transform="rotate(-90 18 166)" fill="var(--muted-foreground)" font-size="12">Points</text>
</svg>
<figcaption style="display:flex;flex-wrap:wrap;gap:.5rem 1rem;background:var(--background-l2);padding:.75rem 1rem;font-size:.8rem"><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-red)"></span>scores/classic</span><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--muted-foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-blue)"></span>scores/sekai</span><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--muted-foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-orange)"></span>scores/steep</span><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--muted-foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-magenta)"></span>scores/genni</span><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--muted-foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-green)"></span>scores/legacy</span></figcaption>
</figure>

The **default** scoring algorithm. Uses a logistic decay function that drops points as more teams solve the challenge.

```yaml
scoreProvider:
  name: scores/classic
```

Challenges start at `<red>maxPoints</red>` with zero solves and decay toward `<red>minPoints</red>` as the solve count climbs. The decay curve is moderate, which works for most CTFs.

:::
:::tab[scores/sekai]

<figure style="margin:1.5rem 0;overflow:hidden;background:var(--background-l1);border-radius:var(--radius-lg)">
<svg viewBox="0 0 720 360" role="img" style="display:block;width:100%"><line x1="58" x2="696" y1="304" y2="304" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="308" text-anchor="end" fill="var(--muted-foreground)" font-size="11">0</text>
<line x1="58" x2="696" y1="248.8" y2="248.8" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="252.8" text-anchor="end" fill="var(--muted-foreground)" font-size="11">100</text>
<line x1="58" x2="696" y1="193.6" y2="193.6" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="197.6" text-anchor="end" fill="var(--muted-foreground)" font-size="11">200</text>
<line x1="58" x2="696" y1="138.4" y2="138.4" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="142.4" text-anchor="end" fill="var(--muted-foreground)" font-size="11">300</text>
<line x1="58" x2="696" y1="83.19999999999999" y2="83.19999999999999" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="87.19999999999999" text-anchor="end" fill="var(--muted-foreground)" font-size="11">400</text>
<line x1="58" x2="696" y1="28" y2="28" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="32" text-anchor="end" fill="var(--muted-foreground)" font-size="11">500</text>
<line x1="58" x2="58" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="58" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">0</text>
<line x1="185.60000000000002" x2="185.60000000000002" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="185.60000000000002" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">10</text>
<line x1="313.20000000000005" x2="313.20000000000005" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="313.20000000000005" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">20</text>
<line x1="440.8" x2="440.8" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="440.8" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">30</text>
<line x1="568.4000000000001" x2="568.4000000000001" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="568.4000000000001" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">40</text>
<line x1="696" x2="696" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="696" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">50</text>
<line x1="58" x2="58" y1="28" y2="304" stroke="var(--foreground)" stroke-width="1.5"/>
<line x1="58" x2="696" y1="304" y2="304" stroke="var(--foreground)" stroke-width="1.5"/>
<polyline points="58.00,28.00 70.76,28.00 83.52,38.49 96.28,51.18 109.04,63.33 121.80,74.92 134.56,85.41 147.32,95.34 160.08,104.18 172.84,112.46 185.60,119.63 198.36,126.81 211.12,132.88 223.88,138.95 236.64,143.92 249.40,148.89 262.16,153.86 274.92,157.72 287.68,161.58 300.44,165.45 313.20,168.76 325.96,171.52 338.72,174.83 351.48,177.59 364.24,179.80 377.00,182.56 389.76,184.77 402.52,186.98 415.28,188.63 428.04,190.84 440.80,192.50 453.56,194.15 466.32,195.81 479.08,197.46 491.84,198.57 504.60,200.22 517.36,201.33 530.12,202.98 542.88,204.09 555.64,205.19 568.40,206.30 581.16,207.40 593.92,207.95 606.68,209.06 619.44,210.16 632.20,210.71 644.96,211.82 657.72,212.37 670.48,213.47 683.24,214.02 696.00,214.58" fill="none" stroke="var(--tone-red)" opacity=".35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<polyline points="58.00,28.00 70.76,28.00 83.52,59.46 96.28,83.20 109.04,101.42 121.80,116.32 134.56,128.46 147.32,138.40 160.08,146.68 172.84,154.41 185.60,160.48 198.36,166.00 211.12,170.97 223.88,175.38 236.64,179.25 249.40,182.56 262.16,185.87 274.92,188.63 287.68,191.39 300.44,193.60 313.20,195.81 325.96,198.02 338.72,199.67 351.48,201.33 364.24,202.98 377.00,204.64 389.76,206.30 402.52,207.40 415.28,208.50 428.04,209.61 440.80,210.71 453.56,211.82 466.32,212.92 479.08,214.02 491.84,214.58 504.60,215.68 517.36,216.23 530.12,217.34 542.88,217.89 555.64,218.44 568.40,219.54 581.16,220.10 593.92,220.65 606.68,221.20 619.44,221.75 632.20,222.30 644.96,222.86 657.72,223.41 670.48,223.96 683.24,224.51 696.00,224.51" fill="none" stroke="var(--tone-orange)" opacity=".35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<polyline points="58.00,28.00 70.76,28.00 83.52,28.00 96.28,304.00 109.04,304.00 121.80,304.00 134.56,304.00 147.32,304.00 160.08,304.00 172.84,304.00 185.60,304.00 198.36,304.00 211.12,304.00 223.88,304.00 236.64,304.00 249.40,304.00 262.16,304.00 274.92,304.00 287.68,304.00 300.44,304.00 313.20,304.00 325.96,304.00 338.72,304.00 351.48,304.00 364.24,304.00 377.00,304.00 389.76,304.00 402.52,304.00 415.28,304.00 428.04,304.00 440.80,304.00 453.56,304.00 466.32,304.00 479.08,304.00 491.84,304.00 504.60,304.00 517.36,304.00 530.12,304.00 542.88,304.00 555.64,304.00 568.40,304.00 581.16,304.00 593.92,304.00 606.68,304.00 619.44,304.00 632.20,304.00 644.96,304.00 657.72,304.00 670.48,304.00 683.24,304.00 696.00,304.00" fill="none" stroke="var(--tone-magenta)" opacity=".35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<polyline points="58.00,28.00 70.76,31.86 83.52,36.28 96.28,40.70 109.04,45.66 121.80,51.18 134.56,56.70 147.32,62.22 160.08,68.85 172.84,74.92 185.60,81.54 198.36,88.72 211.12,95.90 223.88,103.07 236.64,110.80 249.40,117.98 262.16,125.70 274.92,132.88 287.68,140.06 300.44,147.78 313.20,154.41 325.96,161.58 338.72,168.21 351.48,174.83 364.24,180.90 377.00,186.42 389.76,191.94 402.52,197.46 415.28,202.43 428.04,206.85 440.80,210.71 453.56,215.13 466.32,218.44 479.08,221.75 491.84,225.06 504.60,227.82 517.36,230.03 530.12,232.79 542.88,234.45 555.64,236.66 568.40,238.31 581.16,239.97 593.92,241.62 606.68,242.73 619.44,243.83 632.20,244.94 644.96,246.04 657.72,246.59 670.48,247.70 683.24,248.25 696.00,248.80" fill="none" stroke="var(--tone-green)" opacity=".35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<polyline points="58.00,28.00 70.76,28.00 83.52,40.14 96.28,51.18 109.04,61.67 121.80,70.50 134.56,78.78 147.32,86.51 160.08,93.69 172.84,100.86 185.60,106.94 198.36,113.01 211.12,118.53 223.88,124.05 236.64,129.02 249.40,133.98 262.16,138.40 274.92,142.82 287.68,147.23 300.44,151.10 313.20,154.96 325.96,158.82 338.72,162.14 351.48,166.00 364.24,169.31 377.00,172.62 389.76,175.94 402.52,178.70 415.28,182.01 428.04,184.77 440.80,187.53 453.56,190.29 466.32,193.05 479.08,195.26 491.84,198.02 504.60,200.78 517.36,202.98 530.12,205.19 542.88,207.40 555.64,210.16 568.40,212.37 581.16,214.02 593.92,216.23 606.68,218.44 619.44,220.65 632.20,222.30 644.96,224.51 657.72,226.17 670.48,228.38 683.24,230.03 696.00,231.69" fill="none" stroke="var(--tone-blue)" opacity="1" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<text x="377" y="346" text-anchor="middle" fill="var(--muted-foreground)" font-size="12">Solves</text>
<text x="18" y="166" text-anchor="middle" transform="rotate(-90 18 166)" fill="var(--muted-foreground)" font-size="12">Points</text>
</svg>
<figcaption style="display:flex;flex-wrap:wrap;gap:.5rem 1rem;background:var(--background-l2);padding:.75rem 1rem;font-size:.8rem"><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--muted-foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-red)"></span>scores/classic</span><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-blue)"></span>scores/sekai</span><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--muted-foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-orange)"></span>scores/steep</span><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--muted-foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-magenta)"></span>scores/genni</span><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--muted-foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-green)"></span>scores/legacy</span></figcaption>
</figure>

Logarithmic decay with tuned constants (gradient=10, decay=60). Produces a gentler curve than `<green>scores/classic</green>`.

```yaml
scoreProvider:
  name: scores/sekai
```

:::
:::tab[scores/steep]

<figure style="margin:1.5rem 0;overflow:hidden;background:var(--background-l1);border-radius:var(--radius-lg)">
<svg viewBox="0 0 720 360" role="img" style="display:block;width:100%"><line x1="58" x2="696" y1="304" y2="304" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="308" text-anchor="end" fill="var(--muted-foreground)" font-size="11">0</text>
<line x1="58" x2="696" y1="248.8" y2="248.8" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="252.8" text-anchor="end" fill="var(--muted-foreground)" font-size="11">100</text>
<line x1="58" x2="696" y1="193.6" y2="193.6" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="197.6" text-anchor="end" fill="var(--muted-foreground)" font-size="11">200</text>
<line x1="58" x2="696" y1="138.4" y2="138.4" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="142.4" text-anchor="end" fill="var(--muted-foreground)" font-size="11">300</text>
<line x1="58" x2="696" y1="83.19999999999999" y2="83.19999999999999" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="87.19999999999999" text-anchor="end" fill="var(--muted-foreground)" font-size="11">400</text>
<line x1="58" x2="696" y1="28" y2="28" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="32" text-anchor="end" fill="var(--muted-foreground)" font-size="11">500</text>
<line x1="58" x2="58" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="58" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">0</text>
<line x1="185.60000000000002" x2="185.60000000000002" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="185.60000000000002" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">10</text>
<line x1="313.20000000000005" x2="313.20000000000005" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="313.20000000000005" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">20</text>
<line x1="440.8" x2="440.8" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="440.8" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">30</text>
<line x1="568.4000000000001" x2="568.4000000000001" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="568.4000000000001" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">40</text>
<line x1="696" x2="696" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="696" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">50</text>
<line x1="58" x2="58" y1="28" y2="304" stroke="var(--foreground)" stroke-width="1.5"/>
<line x1="58" x2="696" y1="304" y2="304" stroke="var(--foreground)" stroke-width="1.5"/>
<polyline points="58.00,28.00 70.76,28.00 83.52,38.49 96.28,51.18 109.04,63.33 121.80,74.92 134.56,85.41 147.32,95.34 160.08,104.18 172.84,112.46 185.60,119.63 198.36,126.81 211.12,132.88 223.88,138.95 236.64,143.92 249.40,148.89 262.16,153.86 274.92,157.72 287.68,161.58 300.44,165.45 313.20,168.76 325.96,171.52 338.72,174.83 351.48,177.59 364.24,179.80 377.00,182.56 389.76,184.77 402.52,186.98 415.28,188.63 428.04,190.84 440.80,192.50 453.56,194.15 466.32,195.81 479.08,197.46 491.84,198.57 504.60,200.22 517.36,201.33 530.12,202.98 542.88,204.09 555.64,205.19 568.40,206.30 581.16,207.40 593.92,207.95 606.68,209.06 619.44,210.16 632.20,210.71 644.96,211.82 657.72,212.37 670.48,213.47 683.24,214.02 696.00,214.58" fill="none" stroke="var(--tone-red)" opacity=".35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<polyline points="58.00,28.00 70.76,28.00 83.52,40.14 96.28,51.18 109.04,61.67 121.80,70.50 134.56,78.78 147.32,86.51 160.08,93.69 172.84,100.86 185.60,106.94 198.36,113.01 211.12,118.53 223.88,124.05 236.64,129.02 249.40,133.98 262.16,138.40 274.92,142.82 287.68,147.23 300.44,151.10 313.20,154.96 325.96,158.82 338.72,162.14 351.48,166.00 364.24,169.31 377.00,172.62 389.76,175.94 402.52,178.70 415.28,182.01 428.04,184.77 440.80,187.53 453.56,190.29 466.32,193.05 479.08,195.26 491.84,198.02 504.60,200.78 517.36,202.98 530.12,205.19 542.88,207.40 555.64,210.16 568.40,212.37 581.16,214.02 593.92,216.23 606.68,218.44 619.44,220.65 632.20,222.30 644.96,224.51 657.72,226.17 670.48,228.38 683.24,230.03 696.00,231.69" fill="none" stroke="var(--tone-blue)" opacity=".35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<polyline points="58.00,28.00 70.76,28.00 83.52,28.00 96.28,304.00 109.04,304.00 121.80,304.00 134.56,304.00 147.32,304.00 160.08,304.00 172.84,304.00 185.60,304.00 198.36,304.00 211.12,304.00 223.88,304.00 236.64,304.00 249.40,304.00 262.16,304.00 274.92,304.00 287.68,304.00 300.44,304.00 313.20,304.00 325.96,304.00 338.72,304.00 351.48,304.00 364.24,304.00 377.00,304.00 389.76,304.00 402.52,304.00 415.28,304.00 428.04,304.00 440.80,304.00 453.56,304.00 466.32,304.00 479.08,304.00 491.84,304.00 504.60,304.00 517.36,304.00 530.12,304.00 542.88,304.00 555.64,304.00 568.40,304.00 581.16,304.00 593.92,304.00 606.68,304.00 619.44,304.00 632.20,304.00 644.96,304.00 657.72,304.00 670.48,304.00 683.24,304.00 696.00,304.00" fill="none" stroke="var(--tone-magenta)" opacity=".35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<polyline points="58.00,28.00 70.76,31.86 83.52,36.28 96.28,40.70 109.04,45.66 121.80,51.18 134.56,56.70 147.32,62.22 160.08,68.85 172.84,74.92 185.60,81.54 198.36,88.72 211.12,95.90 223.88,103.07 236.64,110.80 249.40,117.98 262.16,125.70 274.92,132.88 287.68,140.06 300.44,147.78 313.20,154.41 325.96,161.58 338.72,168.21 351.48,174.83 364.24,180.90 377.00,186.42 389.76,191.94 402.52,197.46 415.28,202.43 428.04,206.85 440.80,210.71 453.56,215.13 466.32,218.44 479.08,221.75 491.84,225.06 504.60,227.82 517.36,230.03 530.12,232.79 542.88,234.45 555.64,236.66 568.40,238.31 581.16,239.97 593.92,241.62 606.68,242.73 619.44,243.83 632.20,244.94 644.96,246.04 657.72,246.59 670.48,247.70 683.24,248.25 696.00,248.80" fill="none" stroke="var(--tone-green)" opacity=".35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<polyline points="58.00,28.00 70.76,28.00 83.52,59.46 96.28,83.20 109.04,101.42 121.80,116.32 134.56,128.46 147.32,138.40 160.08,146.68 172.84,154.41 185.60,160.48 198.36,166.00 211.12,170.97 223.88,175.38 236.64,179.25 249.40,182.56 262.16,185.87 274.92,188.63 287.68,191.39 300.44,193.60 313.20,195.81 325.96,198.02 338.72,199.67 351.48,201.33 364.24,202.98 377.00,204.64 389.76,206.30 402.52,207.40 415.28,208.50 428.04,209.61 440.80,210.71 453.56,211.82 466.32,212.92 479.08,214.02 491.84,214.58 504.60,215.68 517.36,216.23 530.12,217.34 542.88,217.89 555.64,218.44 568.40,219.54 581.16,220.10 593.92,220.65 606.68,221.20 619.44,221.75 632.20,222.30 644.96,222.86 657.72,223.41 670.48,223.96 683.24,224.51 696.00,224.51" fill="none" stroke="var(--tone-orange)" opacity="1" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<text x="377" y="346" text-anchor="middle" fill="var(--muted-foreground)" font-size="12">Solves</text>
<text x="18" y="166" text-anchor="middle" transform="rotate(-90 18 166)" fill="var(--muted-foreground)" font-size="12">Points</text>
</svg>
<figcaption style="display:flex;flex-wrap:wrap;gap:.5rem 1rem;background:var(--background-l2);padding:.75rem 1rem;font-size:.8rem"><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--muted-foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-red)"></span>scores/classic</span><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--muted-foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-blue)"></span>scores/sekai</span><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-orange)"></span>scores/steep</span><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--muted-foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-magenta)"></span>scores/genni</span><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--muted-foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-green)"></span>scores/legacy</span></figcaption>
</figure>

Similar to `<green>scores/classic</green>` but with a steeper decay curve. Points drop more aggressively with early solves, so challenges differentiate faster.

```yaml
scoreProvider:
  name: scores/steep
```

:::
:::tab[scores/jammy]

<figure style="margin:1.5rem 0;overflow:hidden;background:var(--background-l1);border-radius:var(--radius-lg)">
<svg viewBox="0 0 720 360" role="img" style="display:block;width:100%"><line x1="58" x2="696" y1="304" y2="304" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="308" text-anchor="end" fill="var(--muted-foreground)" font-size="11">100</text>
<line x1="58" x2="696" y1="235" y2="235" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="239" text-anchor="end" fill="var(--muted-foreground)" font-size="11">200</text>
<line x1="58" x2="696" y1="166" y2="166" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="170" text-anchor="end" fill="var(--muted-foreground)" font-size="11">300</text>
<line x1="58" x2="696" y1="97" y2="97" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="101" text-anchor="end" fill="var(--muted-foreground)" font-size="11">400</text>
<line x1="58" x2="696" y1="28" y2="28" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="32" text-anchor="end" fill="var(--muted-foreground)" font-size="11">500</text>
<line x1="58" x2="58" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="58" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">0</text>
<line x1="185.60000000000002" x2="185.60000000000002" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="185.60000000000002" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">20</text>
<line x1="313.20000000000005" x2="313.20000000000005" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="313.20000000000005" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">40</text>
<line x1="440.8" x2="440.8" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="440.8" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">60</text>
<line x1="568.4000000000001" x2="568.4000000000001" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="568.4000000000001" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">80</text>
<line x1="696" x2="696" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="696" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">100</text>
<line x1="58" x2="58" y1="28" y2="304" stroke="var(--foreground)" stroke-width="1.5"/>
<line x1="58" x2="696" y1="304" y2="304" stroke="var(--foreground)" stroke-width="1.5"/>
<polyline points="58.00,304.00 64.38,300.55 70.76,297.10 77.14,293.65 83.52,290.20 89.90,286.75 96.28,283.30 102.66,279.85 109.04,276.40 115.42,272.95 121.80,269.50 128.18,266.05 134.56,262.60 140.94,259.15 147.32,255.70 153.70,252.25 160.08,248.80 166.46,245.35 172.84,241.90 179.22,238.45 185.60,235.00 191.98,231.55 198.36,228.10 204.74,224.65 211.12,221.20 217.50,217.75 223.88,214.30 230.26,210.85 236.64,207.40 243.02,203.95 249.40,200.50 255.78,197.05 262.16,193.60 268.54,190.15 274.92,186.70 281.30,183.25 287.68,179.80 294.06,176.35 300.44,172.90 306.82,169.45 313.20,166.00 319.58,162.55 325.96,159.10 332.34,155.65 338.72,152.20 345.10,148.75 351.48,145.30 357.86,141.85 364.24,138.40 370.62,134.95 377.00,131.50 383.38,128.05 389.76,124.60 396.14,121.15 402.52,117.70 408.90,114.25 415.28,110.80 421.66,107.35 428.04,103.90 434.42,100.45 440.80,97.00 447.18,93.55 453.56,90.10 459.94,86.65 466.32,83.20 472.70,79.75 479.08,76.30 485.46,72.85 491.84,69.40 498.22,65.95 504.60,62.50 510.98,59.05 517.36,55.60 523.74,52.15 530.12,48.70 536.50,45.25 542.88,41.80 549.26,38.35 555.64,34.90 562.02,31.45 568.40,28.00 574.78,28.00 581.16,28.00 587.54,28.00 593.92,28.00 600.30,28.00 606.68,28.00 613.06,28.00 619.44,28.00 625.82,28.00 632.20,28.00 638.58,28.00 644.96,28.00 651.34,28.00 657.72,28.00 664.10,28.00 670.48,28.00 676.86,28.00 683.24,28.00 689.62,28.00 696.00,28.00" fill="none" stroke="var(--tone-cyan)" opacity="1" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<text x="377" y="346" text-anchor="middle" fill="var(--muted-foreground)" font-size="12">Event elapsed before first solve (%)</text>
<text x="18" y="166" text-anchor="middle" transform="rotate(-90 18 166)" fill="var(--muted-foreground)" font-size="12">Points</text>
</svg>
<figcaption style="display:flex;flex-wrap:wrap;gap:.5rem 1rem;background:var(--background-l2);padding:.75rem 1rem;font-size:.8rem"><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-cyan)"></span>scores/jammy</span></figcaption>
</figure>

Time-based scoring that values challenges by when they were first solved. Unlike the other providers, this one looks at the first solve time relative to the event duration rather than how many teams solved the challenge.

```yaml
scoreProvider:
  name: scores/jammy
  options:
    maximumScoreTime: 0.8 # Optional, default 0.8
```

| Option | Default | Description |
| --- | --- | --- |
| `<red>maximumScoreTime</red>` | `0.8{:ts}` | Fraction of event duration used to ramp from minimum to maximum points. First solves after this threshold receive maximum points. |

::::note

This provider needs `<red>startTime</red>` and `<red>endTime</red>` set in the configuration. It uses the first solve time to anchor the scoring curve.

::::

:::
:::tab[scores/genni]

<figure style="margin:1.5rem 0;overflow:hidden;background:var(--background-l1);border-radius:var(--radius-lg)">
<svg viewBox="0 0 720 360" role="img" style="display:block;width:100%"><line x1="58" x2="696" y1="304" y2="304" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="308" text-anchor="end" fill="var(--muted-foreground)" font-size="11">0</text>
<line x1="58" x2="696" y1="248.8" y2="248.8" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="252.8" text-anchor="end" fill="var(--muted-foreground)" font-size="11">100</text>
<line x1="58" x2="696" y1="193.6" y2="193.6" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="197.6" text-anchor="end" fill="var(--muted-foreground)" font-size="11">200</text>
<line x1="58" x2="696" y1="138.4" y2="138.4" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="142.4" text-anchor="end" fill="var(--muted-foreground)" font-size="11">300</text>
<line x1="58" x2="696" y1="83.19999999999999" y2="83.19999999999999" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="87.19999999999999" text-anchor="end" fill="var(--muted-foreground)" font-size="11">400</text>
<line x1="58" x2="696" y1="28" y2="28" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="32" text-anchor="end" fill="var(--muted-foreground)" font-size="11">500</text>
<line x1="58" x2="58" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="58" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">0</text>
<line x1="185.60000000000002" x2="185.60000000000002" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="185.60000000000002" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">10</text>
<line x1="313.20000000000005" x2="313.20000000000005" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="313.20000000000005" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">20</text>
<line x1="440.8" x2="440.8" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="440.8" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">30</text>
<line x1="568.4000000000001" x2="568.4000000000001" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="568.4000000000001" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">40</text>
<line x1="696" x2="696" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="696" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">50</text>
<line x1="58" x2="58" y1="28" y2="304" stroke="var(--foreground)" stroke-width="1.5"/>
<line x1="58" x2="696" y1="304" y2="304" stroke="var(--foreground)" stroke-width="1.5"/>
<polyline points="58.00,28.00 70.76,28.00 83.52,38.49 96.28,51.18 109.04,63.33 121.80,74.92 134.56,85.41 147.32,95.34 160.08,104.18 172.84,112.46 185.60,119.63 198.36,126.81 211.12,132.88 223.88,138.95 236.64,143.92 249.40,148.89 262.16,153.86 274.92,157.72 287.68,161.58 300.44,165.45 313.20,168.76 325.96,171.52 338.72,174.83 351.48,177.59 364.24,179.80 377.00,182.56 389.76,184.77 402.52,186.98 415.28,188.63 428.04,190.84 440.80,192.50 453.56,194.15 466.32,195.81 479.08,197.46 491.84,198.57 504.60,200.22 517.36,201.33 530.12,202.98 542.88,204.09 555.64,205.19 568.40,206.30 581.16,207.40 593.92,207.95 606.68,209.06 619.44,210.16 632.20,210.71 644.96,211.82 657.72,212.37 670.48,213.47 683.24,214.02 696.00,214.58" fill="none" stroke="var(--tone-red)" opacity=".35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<polyline points="58.00,28.00 70.76,28.00 83.52,40.14 96.28,51.18 109.04,61.67 121.80,70.50 134.56,78.78 147.32,86.51 160.08,93.69 172.84,100.86 185.60,106.94 198.36,113.01 211.12,118.53 223.88,124.05 236.64,129.02 249.40,133.98 262.16,138.40 274.92,142.82 287.68,147.23 300.44,151.10 313.20,154.96 325.96,158.82 338.72,162.14 351.48,166.00 364.24,169.31 377.00,172.62 389.76,175.94 402.52,178.70 415.28,182.01 428.04,184.77 440.80,187.53 453.56,190.29 466.32,193.05 479.08,195.26 491.84,198.02 504.60,200.78 517.36,202.98 530.12,205.19 542.88,207.40 555.64,210.16 568.40,212.37 581.16,214.02 593.92,216.23 606.68,218.44 619.44,220.65 632.20,222.30 644.96,224.51 657.72,226.17 670.48,228.38 683.24,230.03 696.00,231.69" fill="none" stroke="var(--tone-blue)" opacity=".35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<polyline points="58.00,28.00 70.76,28.00 83.52,59.46 96.28,83.20 109.04,101.42 121.80,116.32 134.56,128.46 147.32,138.40 160.08,146.68 172.84,154.41 185.60,160.48 198.36,166.00 211.12,170.97 223.88,175.38 236.64,179.25 249.40,182.56 262.16,185.87 274.92,188.63 287.68,191.39 300.44,193.60 313.20,195.81 325.96,198.02 338.72,199.67 351.48,201.33 364.24,202.98 377.00,204.64 389.76,206.30 402.52,207.40 415.28,208.50 428.04,209.61 440.80,210.71 453.56,211.82 466.32,212.92 479.08,214.02 491.84,214.58 504.60,215.68 517.36,216.23 530.12,217.34 542.88,217.89 555.64,218.44 568.40,219.54 581.16,220.10 593.92,220.65 606.68,221.20 619.44,221.75 632.20,222.30 644.96,222.86 657.72,223.41 670.48,223.96 683.24,224.51 696.00,224.51" fill="none" stroke="var(--tone-orange)" opacity=".35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<polyline points="58.00,28.00 70.76,31.86 83.52,36.28 96.28,40.70 109.04,45.66 121.80,51.18 134.56,56.70 147.32,62.22 160.08,68.85 172.84,74.92 185.60,81.54 198.36,88.72 211.12,95.90 223.88,103.07 236.64,110.80 249.40,117.98 262.16,125.70 274.92,132.88 287.68,140.06 300.44,147.78 313.20,154.41 325.96,161.58 338.72,168.21 351.48,174.83 364.24,180.90 377.00,186.42 389.76,191.94 402.52,197.46 415.28,202.43 428.04,206.85 440.80,210.71 453.56,215.13 466.32,218.44 479.08,221.75 491.84,225.06 504.60,227.82 517.36,230.03 530.12,232.79 542.88,234.45 555.64,236.66 568.40,238.31 581.16,239.97 593.92,241.62 606.68,242.73 619.44,243.83 632.20,244.94 644.96,246.04 657.72,246.59 670.48,247.70 683.24,248.25 696.00,248.80" fill="none" stroke="var(--tone-green)" opacity=".35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<polyline points="58.00,28.00 70.76,28.00 83.52,28.00 96.28,304.00 109.04,304.00 121.80,304.00 134.56,304.00 147.32,304.00 160.08,304.00 172.84,304.00 185.60,304.00 198.36,304.00 211.12,304.00 223.88,304.00 236.64,304.00 249.40,304.00 262.16,304.00 274.92,304.00 287.68,304.00 300.44,304.00 313.20,304.00 325.96,304.00 338.72,304.00 351.48,304.00 364.24,304.00 377.00,304.00 389.76,304.00 402.52,304.00 415.28,304.00 428.04,304.00 440.80,304.00 453.56,304.00 466.32,304.00 479.08,304.00 491.84,304.00 504.60,304.00 517.36,304.00 530.12,304.00 542.88,304.00 555.64,304.00 568.40,304.00 581.16,304.00 593.92,304.00 606.68,304.00 619.44,304.00 632.20,304.00 644.96,304.00 657.72,304.00 670.48,304.00 683.24,304.00 696.00,304.00" fill="none" stroke="var(--tone-magenta)" opacity="1" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<text x="377" y="346" text-anchor="middle" fill="var(--muted-foreground)" font-size="12">Solves</text>
<text x="18" y="166" text-anchor="middle" transform="rotate(-90 18 166)" fill="var(--muted-foreground)" font-size="12">Points</text>
</svg>
<figcaption style="display:flex;flex-wrap:wrap;gap:.5rem 1rem;background:var(--background-l2);padding:.75rem 1rem;font-size:.8rem"><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--muted-foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-red)"></span>scores/classic</span><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--muted-foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-blue)"></span>scores/sekai</span><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--muted-foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-orange)"></span>scores/steep</span><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-magenta)"></span>scores/genni</span><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--muted-foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-green)"></span>scores/legacy</span></figcaption>
</figure>

A binary scoring algorithm. It returns `<red>maxPoints</red>` if the challenge has 0 to 2 solves, and `0{:ts}` points otherwise. Good for challenges that shouldn't contribute to the score once they're widely solved.

```yaml
scoreProvider:
  name: scores/genni
```

:::
:::tab[scores/legacy]

<figure style="margin:1.5rem 0;overflow:hidden;background:var(--background-l1);border-radius:var(--radius-lg)">
<svg viewBox="0 0 720 360" role="img" style="display:block;width:100%"><line x1="58" x2="696" y1="304" y2="304" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="308" text-anchor="end" fill="var(--muted-foreground)" font-size="11">0</text>
<line x1="58" x2="696" y1="248.8" y2="248.8" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="252.8" text-anchor="end" fill="var(--muted-foreground)" font-size="11">100</text>
<line x1="58" x2="696" y1="193.6" y2="193.6" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="197.6" text-anchor="end" fill="var(--muted-foreground)" font-size="11">200</text>
<line x1="58" x2="696" y1="138.4" y2="138.4" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="142.4" text-anchor="end" fill="var(--muted-foreground)" font-size="11">300</text>
<line x1="58" x2="696" y1="83.19999999999999" y2="83.19999999999999" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="87.19999999999999" text-anchor="end" fill="var(--muted-foreground)" font-size="11">400</text>
<line x1="58" x2="696" y1="28" y2="28" stroke="var(--border)" stroke-width="1"/>
<text x="46" y="32" text-anchor="end" fill="var(--muted-foreground)" font-size="11">500</text>
<line x1="58" x2="58" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="58" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">0</text>
<line x1="185.60000000000002" x2="185.60000000000002" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="185.60000000000002" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">10</text>
<line x1="313.20000000000005" x2="313.20000000000005" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="313.20000000000005" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">20</text>
<line x1="440.8" x2="440.8" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="440.8" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">30</text>
<line x1="568.4000000000001" x2="568.4000000000001" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="568.4000000000001" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">40</text>
<line x1="696" x2="696" y1="28" y2="304" stroke="var(--border)" stroke-opacity="0.5" stroke-width="1"/>
<text x="696" y="326" text-anchor="middle" fill="var(--muted-foreground)" font-size="11">50</text>
<line x1="58" x2="58" y1="28" y2="304" stroke="var(--foreground)" stroke-width="1.5"/>
<line x1="58" x2="696" y1="304" y2="304" stroke="var(--foreground)" stroke-width="1.5"/>
<polyline points="58.00,28.00 70.76,28.00 83.52,38.49 96.28,51.18 109.04,63.33 121.80,74.92 134.56,85.41 147.32,95.34 160.08,104.18 172.84,112.46 185.60,119.63 198.36,126.81 211.12,132.88 223.88,138.95 236.64,143.92 249.40,148.89 262.16,153.86 274.92,157.72 287.68,161.58 300.44,165.45 313.20,168.76 325.96,171.52 338.72,174.83 351.48,177.59 364.24,179.80 377.00,182.56 389.76,184.77 402.52,186.98 415.28,188.63 428.04,190.84 440.80,192.50 453.56,194.15 466.32,195.81 479.08,197.46 491.84,198.57 504.60,200.22 517.36,201.33 530.12,202.98 542.88,204.09 555.64,205.19 568.40,206.30 581.16,207.40 593.92,207.95 606.68,209.06 619.44,210.16 632.20,210.71 644.96,211.82 657.72,212.37 670.48,213.47 683.24,214.02 696.00,214.58" fill="none" stroke="var(--tone-red)" opacity=".35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<polyline points="58.00,28.00 70.76,28.00 83.52,40.14 96.28,51.18 109.04,61.67 121.80,70.50 134.56,78.78 147.32,86.51 160.08,93.69 172.84,100.86 185.60,106.94 198.36,113.01 211.12,118.53 223.88,124.05 236.64,129.02 249.40,133.98 262.16,138.40 274.92,142.82 287.68,147.23 300.44,151.10 313.20,154.96 325.96,158.82 338.72,162.14 351.48,166.00 364.24,169.31 377.00,172.62 389.76,175.94 402.52,178.70 415.28,182.01 428.04,184.77 440.80,187.53 453.56,190.29 466.32,193.05 479.08,195.26 491.84,198.02 504.60,200.78 517.36,202.98 530.12,205.19 542.88,207.40 555.64,210.16 568.40,212.37 581.16,214.02 593.92,216.23 606.68,218.44 619.44,220.65 632.20,222.30 644.96,224.51 657.72,226.17 670.48,228.38 683.24,230.03 696.00,231.69" fill="none" stroke="var(--tone-blue)" opacity=".35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<polyline points="58.00,28.00 70.76,28.00 83.52,59.46 96.28,83.20 109.04,101.42 121.80,116.32 134.56,128.46 147.32,138.40 160.08,146.68 172.84,154.41 185.60,160.48 198.36,166.00 211.12,170.97 223.88,175.38 236.64,179.25 249.40,182.56 262.16,185.87 274.92,188.63 287.68,191.39 300.44,193.60 313.20,195.81 325.96,198.02 338.72,199.67 351.48,201.33 364.24,202.98 377.00,204.64 389.76,206.30 402.52,207.40 415.28,208.50 428.04,209.61 440.80,210.71 453.56,211.82 466.32,212.92 479.08,214.02 491.84,214.58 504.60,215.68 517.36,216.23 530.12,217.34 542.88,217.89 555.64,218.44 568.40,219.54 581.16,220.10 593.92,220.65 606.68,221.20 619.44,221.75 632.20,222.30 644.96,222.86 657.72,223.41 670.48,223.96 683.24,224.51 696.00,224.51" fill="none" stroke="var(--tone-orange)" opacity=".35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<polyline points="58.00,28.00 70.76,28.00 83.52,28.00 96.28,304.00 109.04,304.00 121.80,304.00 134.56,304.00 147.32,304.00 160.08,304.00 172.84,304.00 185.60,304.00 198.36,304.00 211.12,304.00 223.88,304.00 236.64,304.00 249.40,304.00 262.16,304.00 274.92,304.00 287.68,304.00 300.44,304.00 313.20,304.00 325.96,304.00 338.72,304.00 351.48,304.00 364.24,304.00 377.00,304.00 389.76,304.00 402.52,304.00 415.28,304.00 428.04,304.00 440.80,304.00 453.56,304.00 466.32,304.00 479.08,304.00 491.84,304.00 504.60,304.00 517.36,304.00 530.12,304.00 542.88,304.00 555.64,304.00 568.40,304.00 581.16,304.00 593.92,304.00 606.68,304.00 619.44,304.00 632.20,304.00 644.96,304.00 657.72,304.00 670.48,304.00 683.24,304.00 696.00,304.00" fill="none" stroke="var(--tone-magenta)" opacity=".35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<polyline points="58.00,28.00 70.76,31.86 83.52,36.28 96.28,40.70 109.04,45.66 121.80,51.18 134.56,56.70 147.32,62.22 160.08,68.85 172.84,74.92 185.60,81.54 198.36,88.72 211.12,95.90 223.88,103.07 236.64,110.80 249.40,117.98 262.16,125.70 274.92,132.88 287.68,140.06 300.44,147.78 313.20,154.41 325.96,161.58 338.72,168.21 351.48,174.83 364.24,180.90 377.00,186.42 389.76,191.94 402.52,197.46 415.28,202.43 428.04,206.85 440.80,210.71 453.56,215.13 466.32,218.44 479.08,221.75 491.84,225.06 504.60,227.82 517.36,230.03 530.12,232.79 542.88,234.45 555.64,236.66 568.40,238.31 581.16,239.97 593.92,241.62 606.68,242.73 619.44,243.83 632.20,244.94 644.96,246.04 657.72,246.59 670.48,247.70 683.24,248.25 696.00,248.80" fill="none" stroke="var(--tone-green)" opacity="1" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
<text x="377" y="346" text-anchor="middle" fill="var(--muted-foreground)" font-size="12">Solves</text>
<text x="18" y="166" text-anchor="middle" transform="rotate(-90 18 166)" fill="var(--muted-foreground)" font-size="12">Points</text>
</svg>
<figcaption style="display:flex;flex-wrap:wrap;gap:.5rem 1rem;background:var(--background-l2);padding:.75rem 1rem;font-size:.8rem"><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--muted-foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-red)"></span>scores/classic</span><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--muted-foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-blue)"></span>scores/sekai</span><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--muted-foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-orange)"></span>scores/steep</span><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--muted-foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-magenta)"></span>scores/genni</span><span style="display:inline-flex;align-items:center;gap:.5rem;color:var(--foreground)"><span style="display:inline-block;width:.65rem;height:.65rem;border-radius:999px;background:var(--tone-green)"></span>scores/legacy</span></figcaption>
</figure>

Hyperbolic tangent-based decay that normalizes against the maximum solve count across all challenges. This was the original rCTF scoring algorithm.

```yaml
scoreProvider:
  name: scores/legacy
```

::::note

This provider needs `<red>maxSolves</red>` (the maximum solve count across all challenges) to normalize the curve. Expect surprising results if challenge solve counts vary widely.

::::

:::
::::
