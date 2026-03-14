---
title: Challenge Design
description: Guidelines for planning, authoring, and testing CTF challenges, including difficulty distribution, flag formats, and quality assurance.
---

Prior to authoring challenges, it is important to establish the general format and scope of the competition. The following are common characteristics of a well-organized CTF:

- The event should last for either 24 or 48 hours and be held on a weekend or Friday night.

- Challenges should conform to [standard CTF categories](/theming/categories#default-categories).

- Each category should contain approximately 2-6 challenges, with a similar number of challenges across all categories.

- Challenge difficulty should be distributed across a range from easy to hard, accommodating participants of varying skill levels. A common distribution is 1-2 easy, 2-3 medium, and 1-2 hard.

## Challenge authoring

Quality challenges are the cornerstone of a successful CTF. The following guidelines should be considered during challenge development.

### General principles

- Avoid recycling challenges from other CTFs or online resources. Participants can often identify reused challenges.

- Avoid making challenges overly difficult, contrived, or reliant on "guessing." A "guessy" challenge is one where the solution is unclear, requiring arbitrary or brute-force approaches instead of logical reasoning based on given information. Challenges should provide enough clues to allow logical progress and should reward problem-solving and skill. If no one solves a challenge, it is likely a design issue rather than a difficulty issue.

- Challenges should be solvable within a reasonable timeframe given the event duration.

- Challenge descriptions should not include red herrings.

- Ideally, each challenge teaches or reinforces a concept or technique.

### Challenge components

Each challenge should include the following:

| Component       | Comments                                                                                                                                                                                                                                                        | Necessity             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| **Title**       | A memorable name. The typical convention is to use [Kebab case](https://developer.mozilla.org/en-US/docs/Glossary/Kebab_case) for titles. Please be fun with the title rather than calling it `keygen` or `pwnme` or `warmup` or `crackme`.                     | Required              |
| **Description** | Context and necessary information for the challenge. Descriptions are often themed and playful.                                                                                                                                                                 | Required              |
| **Hints**       | Avoid actually using the "Hints" field, but rather use hints reactively during the CTF for unsolved challenges (e.g., after gauging progress at the 24-hour mark). See [Hint policy](/running-a-successful-ctf/05-during-ctf#hint-policy) for more information. | Optional, uncommon    |
| **Category**    | The primary category (the one most aligned with the challenge, for challenges that fit multiple categories).                                                                                                                                                    | Required              |
| **Author**      | The challenge author. Meta challenges, such as survey or sanity checks, should be authored by "Team" or some other umbrella name.                                                                                                                               | Optional, common      |
| **Tags**        | Additional categorizations. Tags are often used for bounties, challenges part of a series, or challenges that fit into multiple categories.                                                                                                                     | Optional, common      |
| **Difficulty**  | Relative difficulty level. This is a contentious topic due to the subjective nature of difficulty ratings, so this is sometimes excluded.                                                                                                                       | Optional, uncommon    |
| **Flag**        | The solution in the established format.                                                                                                                                                                                                                         | Required              |
| **Attachments** | Any downloadable attachments. Attachments should be nicely zipped and uniquely named to avoid issues like `dist(4).tar.gz`.                                                                                                                                     | Optional, common      |
| **Remote**      | Connection information for hosted challenges (if applicable). They should be placed in a one-line `<pre>` rather than a `<code>`. rCTF provides a custom `[!CONNECTION]` callout for this purpose.                                                              | Optional, common      |
| **Instancer**   | Configuration for instancer challenges (if applicable). This should not be public but rather documented internally, and open-sourced after the CTF.                                                                                                             | Optional, uncommon    |
| **Solution**    | A working solve script or writeup. This should be referenced internally during playtesting and released after the CTF.                                                                                                                                          | Optional, recommended |

### Dockerization

For challenges that require a remote component, containerization using Docker is strongly recommended.

ES3N1N TODO

## Pre-event checklist

Prior to the event, verify the following for each challenge:

- The challenge is solvable with the provided materials. It is best practice to have a single `solve.py` that can output the flag, for challenges that can conform to this specification.
- The challenge is playtested internally. If you want to be safe, involve two playtesters per challenge.
- The flag is correct and matches the expected format.
- The files are correctly packaged, and are downloadable. Also ensure that the files are the right versions, as occasionally authors will update source code without re-packaging distribution zips.
- The remote services are accessible and stable.
- The Docker containers build and run correctly.
- The solution/writeup is documented internally and is accessible to the support team.

:::tip[Recommended reading]
For additional guidance on challenge design, refer to the [CTF Design Guideline](https://bit.ly/ctf-design).
:::
