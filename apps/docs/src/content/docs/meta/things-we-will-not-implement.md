---
title: Things we will not implement
description: Requests rCTF avoids because they tend to reduce fairness, transparency, or educational value.
order: 3
---

rCTF intentionally leaves out a few commonly requested features because, in practice, they can make an event less fair or harder to follow.

:::steps
1. **First blood bonus points**

   Bonus points for the first solve reward time zone, team size, and availability at the opening minute alongside technical skill. First blood is worth recognizing, but it should not change the score.

   Use [Blood bot](/integrations/bloodbot) to recognize first solves without changing the scoring model.

2. **Leaderboard freeze**

   A freeze adds suspense by hiding the last `n{:ts}` hours of standings, but it also removes information teams use to choose what to work on. Visible standings are easier to follow during the event and easier to review afterward.

   rCTF favors transparent standings throughout the event.

3. **Limited flag submission attempts**

   Legitimate teams mistype flags, paste the wrong value, or submit near matches while debugging. Caps and score penalties punish those mistakes without doing much to stop brute force.

   Brute force protection belongs in route and challenge rate limits, not in scoring penalties for normal participant error.

4. **Requiring authentication to see challenges or leaderboard**

   Public challenges and standings let spectators, friends, and future participants follow the event without creating an account.

   rCTF keeps challenge lists and standings visible so the event remains accessible outside the set of registered teams.
:::
