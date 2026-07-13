---
title: Prerequisites
description: Organizational structure, timeline, CTFtime registration, sponsorships, rules, and communication setup for your CTF.
order: 1
---

Before building challenges or deploying infrastructure, decide who is responsible for each part of the event, set a schedule, and establish how participants will get information and support.

## Organizational structure

A small team can run a strong event, but every important job needs a clear owner.

- **Organizers** own the schedule, final decisions, sponsor relationships, merchandise, and prizes.
- **Challenge authors** build challenges and playtest one another's work.
- **Infrastructure leads** deploy the platform and challenges, monitor them during the event, and respond to security or capacity problems. For a long event, rotate this responsibility so someone with access is always available.
- **Support team members** answer participant tickets and bring challenge or infrastructure problems to the right person.

:::tip[Team size]
Five to ten organizers can usually cover a 24 to 48 hour CTF with 20 to 30 challenges. People can hold more than one role, but plan shift coverage before assuming a small team is enough.
:::

### Timeline

Start at least two or three months before the event. One workable schedule is:

- **Three months out**, choose the date, outline the challenges, contact sponsors, and start the CTFtime registration.
- **Two months out**, begin writing challenges.
- **Two weeks out**, freeze new challenge ideas and focus on playtesting, revisions, platform setup, and infrastructure testing.
- **One week out**, finalize every challenge, open registration, announce the event, and prepare Discord for participants.

## CTFtime

[CTFtime](https://ctftime.org) is where most teams discover upcoming CTFs and track their results. Check its calendar before choosing a date, then list the event early enough for the registration to be approved.

:::note[Regarding conflicts]
Avoid overlapping major events, especially qualifiers for onsite finals and competitions with large prizes.
:::

Listing a CTF takes three steps:

1. [Create a team](https://ctftime.org/team/new/). The same team can compete in and organize events.
2. [Register the event series](https://ctftime.org/event/mail/), such as "My CTF." The CTFtime team reviews this manually, so submit it well before the event.
3. [Add an edition](https://ctftime.org/event/new/) for the specific competition, such as "My CTF 2026."

After the event, upload the final scoreboard so teams receive CTFtime ranking points. Competitors also vote on the event's [weight](https://ctftime.org/faq/#weight-vote), which can increase as the event establishes a history.

:::note
Additional information regarding CTF organization is available on CTFtime's [organizer resources page](https://ctftime.org/for-organizers/).
:::

## Homepage

The homepage is the first thing participants see. It should cover event timing, rules, prizes, sponsors, and anything else worth surfacing up front.

### Rules

Publish the rules before registration opens. A reasonable starting point is:

> - There is no team limit.\*
> - Do not attack or interfere with other teams, the competition infrastructure, or other competitors.
> - Do not share flags, solutions, or hints with other teams.
> - Do not discuss challenges with other teams until the CTF is over.
> - Do not attempt to brute-force flags or flag submission endpoints.
> - Do not use automated tools or scanners against competition infrastructure.
> - Each player may only be a member of one team. Do not register multiple accounts.
> - Tiebreakers are resolved by the timestamp of the last solve that brought the team to their final score.
> - Violating any of the above rules may result in disqualification at the discretion of the organizers.

:::note
\*Team size limits are difficult to enforce. rCTF gives each team one shared token, so the platform cannot count individual members.
:::

### Sponsorships and prizes

Prizes are optional, though many events reward the top three teams or strong post-event writeups. Sponsors often cover those costs.

When looking for sponsors:

- Start two or three months ahead. Approval can take time.
- Prepare a short proposal with the event audience, expected participation, sponsor benefits, and a few funding levels.
- Begin with companies and organizations that already support security events or have worked with your team.

Possible starting points include:

- [OtterSec](https://osec.io/ctf)
- [GCP credits for CTF infrastructure by Google](https://goo.gle/ctfsponsorship)
- Sponsor lists from [upcoming](https://ctftime.org/event/list/upcoming) and [past](https://ctftime.org/event/list/past) CTFs

Common sponsor benefits include:

- Logo placement on the CTF homepage and merchandise, if applicable
- Shoutouts on social media and announcement channels
- A challenge written by the sponsor or built around one of its tools, when that fits the event
- A talk or booth at an onsite event

## Communication

### Discord setup

Most CTFs use Discord as the main communication channel for announcements, support, and post-event discussion.

A typical Discord server configuration for a CTF includes the following channels:

| Channel | Purpose |
| --- | --- |
| `#rules` | Discord and CTF-specific rules |
| `#announcements` | Registration status, CTF start/end times, challenge updates, and feedback requests |
| `#first-bloods` | Recognition of teams who achieved the first solve on a challenge |
| `#support` | Support ticket creation for issues such as broken challenges (e.g., via [Tickets v2](https://tickets.bot/)) |
| `#general` | General discussion |
| `#looking-for-team` | Team formation for participants seeking teammates |
| `#web`/`#rev`/`#pwn`/... | Category-specific discussion channels, if desired |

Keep support in one place instead of answering direct messages. A ticket channel gives the team a shared record of platform problems, broken challenges, incorrect flags, and hint requests.

### Hints

:::caution[No-hint policy]
Do not give private hints to individual teams. Even a well-intended nudge can look unfair in a competition.
:::

When a participant reports a challenge problem, confirm that the live service and reference solution still work. Do not reveal anything about the intended solution.

If hints or clarifications become necessary, see the [hint policy section](/meta/running-a-successful-ctf/during-ctf#hint-policy) for more information.
