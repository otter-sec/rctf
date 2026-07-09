---
title: Things we will not implement
description: Requests rCTF avoids because they tend to reduce fairness, transparency, or educational value.
order: 3
---

Some platform requests appear often enough that it is useful to document the project position. rCTF does not plan to support the following features because they tend to work against fair scoring, transparent events, or the educational value of a CTF.

:::steps
1. **First blood bonus points**

   This would award extra points to the first team that solves a challenge. First blood is useful recognition, but adding score weight to it often rewards timezone, team size, and start-time availability as much as technical skill. Teams that are awake at the opening minute, or teams with enough members to split across many challenges immediately, can gain an advantage that is only loosely related to problem solving.

   Use [Blood bot](/integrations/bloodbot) to recognize first solves without changing the scoring model.

2. **Leaderboard freeze**

   This would hide standings for the last `n{:ts}` hours of the event. Some events use a freeze to add suspense, but it also removes information participants use to decide what to work on. Visible standings make the event easier to follow during play and easier to review afterward.

   rCTF favors transparent standings throughout the event.

3. **Limited flag submission attempts**

   This would cap the number of flags a team can submit, or apply per-team penalties to wrong submissions. In practice, legitimate teams mistype flags, paste the wrong value, or submit a nearly correct value while debugging. Submission caps make those ordinary mistakes more stressful without doing much to stop brute force attempts.

   Brute force protection belongs in route and challenge rate limits, not in scoring penalties for normal participant error.

4. **Requiring authentication to see challenges or leaderboard**

   This would require visitors to log in before they can view the challenge list or scoreboard. CTFs are educational events, and public visibility helps spectators, friends of teams, and future participants understand what is happening.

   rCTF keeps challenge lists and standings visible so the event remains accessible outside the set of registered teams.
:::
