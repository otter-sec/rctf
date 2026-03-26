---
title: Scoring Providers
description: Choose and configure a dynamic scoring algorithm for your CTF.
---

Scoring providers determine how challenge point values change as teams solve them. rCTF includes six scoring algorithms.

## Configuration

```yaml
scoreProvider:
  name: scores/classic # Default
```

Each challenge defines a point range via `points.min` and `points.max` in its data. The scoring provider calculates the current point value based on the number of solves and other context.

## Score context

All scoring providers receive a context object with:

| Field            | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| `minPoints`      | Minimum points for the challenge (floor)                    |
| `maxPoints`      | Maximum points for the challenge (ceiling, when 0 solves)   |
| `solves`         | Current number of solves                                    |
| `maxSolves`      | Maximum solves across all challenges (used by `legacy`)     |
| `eventStartTime` | Competition start time (used by `jammy`)                    |
| `eventEndTime`   | Competition end time (used by `jammy`)                      |
| `firstSolveTime` | Time of the first solve for the challenge (used by `jammy`) |

## Providers

### scores/classic

The **default** scoring algorithm. Uses a logistic decay function that decreases points as more teams solve the challenge.

```yaml
scoreProvider:
  name: scores/classic
```

Challenges start at `maxPoints` with zero solves and decay toward `minPoints` as the solve count increases. The decay curve is moderate, suitable for most CTFs.

### scores/sekai

Logarithmic decay with tuned constants (gradient=10, decay=60). Produces a gentler curve than `classic`.

```yaml
scoreProvider:
  name: scores/sekai
```

### scores/steep

Similar to `classic` but with a steeper decay curve. Points drop more aggressively with early solves, making challenges differentiate faster.

```yaml
scoreProvider:
  name: scores/steep
```

### scores/jammy

Time-based scoring that rewards earlier solves with more points. Unlike other providers, this one considers when a challenge was solved relative to the event duration rather than how many teams solved it.

```yaml
scoreProvider:
  name: scores/jammy
  options:
    maximumScoreTime: 0.8 # Optional, default 0.8
```

| Option             | Default | Description                                                                                                     |
| ------------------ | ------- | --------------------------------------------------------------------------------------------------------------- |
| `maximumScoreTime` | `0.8`   | Fraction of event duration used for full score calculation. Solves after this threshold receive minimum points. |

:::note
This provider requires `startTime` and `endTime` to be set in the configuration. It uses the first solve time to anchor the scoring curve.
:::

### scores/genni

Binary scoring: returns `maxPoints` if the challenge has 0-2 solves, and 0 points otherwise. Useful for challenges that should not contribute to score once widely solved.

```yaml
scoreProvider:
  name: scores/genni
```

### scores/legacy

Hyperbolic tangent-based decay that normalizes against the maximum solve count across all challenges. This was the original rCTF scoring algorithm.

```yaml
scoreProvider:
  name: scores/legacy
```

:::note
This provider requires `maxSolves` (the maximum solve count across all challenges) to properly normalize the curve. It may produce unexpected results if challenge solve counts vary widely.
:::
