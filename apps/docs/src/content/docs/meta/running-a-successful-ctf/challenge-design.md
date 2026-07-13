---
title: Challenge design
description: Guidelines for planning, authoring, and testing CTF challenges, including difficulty distribution, flag formats, and quality assurance.
order: 2
---

Set the event format before authors begin. For a typical online jeopardy CTF:

- Run for 24 or 48 hours, usually over a weekend.

- Use recognizable [CTF categories](/theming/categories#default-categories).

- Aim for two to six challenges per category and avoid leaving one category noticeably thinner than the others.

- Include a real range of difficulty. One or two easy, two or three medium, and one or two hard challenges per category is a useful starting point.

## Challenge authoring

Good challenges are what make a CTF worth playing. Keep these guidelines in mind during development.

### General principles

- Write original challenges. Reused problems are often searchable or recognizable.

- Give solvers enough information to make reasoned progress. If the only way forward is to guess what the author had in mind or try arbitrary inputs, the challenge is unclear rather than difficult. An unsolved challenge is usually a reason to revisit the design.

- Make sure the intended solution fits the length of the event.

- Do not use fake clues or red herrings.

- Give each challenge a technical idea worth learning or practicing.

### Challenge components

Each challenge should include the following:

| Component | Comments | Necessity |
| --- | --- | --- |
| **Title** | A memorable name. Prefer something distinctive over `keygen`, `pwnme`, `warmup`, or `crackme`. | Required |
| **Description** | Context and necessary information for the challenge. Descriptions are often themed and playful. | Required |
| **Hints** | Usually released during the event when an unsolved challenge needs clarification. See [Hint policy](/meta/running-a-successful-ctf/during-ctf#hint-policy). | Optional, uncommon |
| **Category** | The category that best matches the main technique. | Required |
| **Author** | The challenge author. Meta challenges, such as survey or sanity checks, should be authored by "Team" or some other umbrella name. | Optional, common |
| **Tags** | Extra labels for bounties, challenge series, or secondary categories. | Optional, common |
| **Difficulty** | A rough rating. Because difficulty is subjective, many events omit it. | Optional, uncommon |
| **Flag** | The solution in the established format. | Required |
| **Attachments** | Downloadable files, packaged cleanly and given stable names instead of names such as `dist(4).tar.gz`. | Optional, common |
| **Remote** | Connection details for a hosted challenge. Use rCTF's `[!CONNECTION]{:md}` callout. | Optional, common |
| **Instancer** | Per-team instance configuration. Keep it private during the event and publish it with the challenge afterward. | Optional, uncommon |
| **Solution** | A working solve script or writeup for playtesting, support, and post-event release. | Optional, recommended |

### Dockerization

Package remote challenges as containers so the same build can be tested, deployed, and reproduced after the event.

#### Best practices

- Keep **one challenge per container** so each challenge stays self-contained. If a challenge requires multiple services (e.g., a web app and a database), use Docker Compose.
- Reach for **minimal base images** like `alpine` or `debian-slim` to reduce build times and attack surface.
- **Build artifacts separately** with multi-stage builds, compiling binaries in one stage and copying only the final artifact into the runtime image.
- Run challenge services as **non-root users** inside the container to limit the impact of container escapes.
- Use a **read-only filesystem** where possible by mounting the root filesystem as read-only (`readOnly: true{:yml}` or `<dim>--read-only</dim>`) and using a tmpfs for writable directories.

#### Security defaults

When deploying challenges, apply the following security settings:

- `cap_drop: ALL{:yml}` drops all Linux capabilities.
- `no-new-privileges: true{:yml}` prevents privilege escalation.
- Memory and PID limits prevent resource exhaustion (e.g., fork bombs).
- Network isolation uses internal networks for multi-container challenges where services should not be directly reachable.

#### Example Dockerfile

```dockerfile title="Dockerfile"
FROM python:3.12-slim

RUN useradd -m ctf
WORKDIR /home/ctf

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py flag.txt ./
RUN chmod 444 flag.txt

USER ctf
EXPOSE 5000
CMD ["python", "app.py"]
```

#### Using with rCTF instancer

With the rCTF [Docker instancer](/integrations/instancer), describe the challenge services in `<red>instancerConfig</red>`. The instancer creates the containers and network for each team, then removes them when the instance expires.

## Pre-event checklist

Before the event, verify the following for each challenge:

- The challenge is solvable with the provided materials. Where it fits, ship a single `solve.py` that outputs the flag.
- The challenge has been playtested internally. Two playtesters per challenge is the safer bet.
- The flag is correct and matches the expected format.
- The files are correctly packaged and downloadable. Double-check that the files are the right versions, since authors sometimes update source code without re-packaging the distribution zip.
- The remote services are accessible and stable.
- The Docker containers build and run correctly.
- The solution or writeup is documented internally and accessible to the support team.

:::tip[Recommended reading]
For additional guidance on challenge design, refer to the [CTF Design Guideline](https://bit.ly/ctf-design).
:::
