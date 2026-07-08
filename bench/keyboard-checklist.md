# Keyboard navigation checklist (R3b)

Scripted probe (2026-07-07): 15 Tab presses per route, recording the focused
element and whether a visible focus indicator (outline / box-shadow /
`:focus-visible`) was present. Script: session scratchpad `keyboard-probe.ts`
(same login + Tab-walk approach as `bench/interactions.ts`).

| Flow                                 | v1 (web)                                | v2 (web-new)                                |
| ------------------------------------ | --------------------------------------- | ------------------------------------------- |
| /challenges — tab stops reachable    | 15/15 with focus indicator              | 15/15 with focus indicator                  |
| /challenges — search input reachable | pass (unlabeled `input`)                | pass (`aria-label="Search challenges"`)     |
| /scores — tab stops reachable        | 15/15 with focus indicator              | 15/15 with focus indicator                  |
| /scores — controls labeled           | partial (`button` unlabeled first stop) | pass (Export screenshot, Pin top 3 labeled) |
| Nav links labeled                    | pass (Home/Challenges/Scoreboard)       | pass                                        |

Verdict: parity on reachability and focus visibility; v2 has more complete
`aria-label` coverage on interactive controls.
