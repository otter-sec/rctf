---
title: Prerequisites
description: Organizational structure, timeline, CTFtime registration, sponsorships, rules, and communication setup for your CTF.
order: 1
---

Running a CTF takes coordination across challenge development, infrastructure, sponsorship, and communication. The following sections cover the organizational and logistical groundwork you'll want in place before the technical details come up.

## Organizational structure

A successful CTF requires a dedicated team with clearly defined roles and responsibilities.

- **Organizers** are the core coordinators, responsible for managing the event from start to finish. Their duties include managing timelines, overseeing team operations, making final decisions, maintaining sponsor relationships, and handling logistics such as merchandise orders and prize distribution.
- **Challenge authors** create and implement the CTF's challenges. In addition to developing problems, authors typically playtest each other's work to ensure quality and balance.
- **Infrastructure leads** manage the technical side of the competition. Their work includes deploying the platform, hosting challenges, watching system health, enforcing security (firewalls, anti-DDoS, and so on), and scaling resources when appropriate. They should be available throughout the competition for incident response, or the team should rotate shifts to cover the full event (a team spread across time zones helps here).
- **Support team members** address participant tickets and resolve issues as they arise.

:::tip[Team size]
For a typical 24-48 hour CTF with 20-30 challenges, a team of 5-10 organizers is generally sufficient. Larger events may require additional personnel, and it is common for individuals to wear multiple hats depending on the team's size and expertise.
:::

### Timeline

Start preparations at least 2-3 months before the event. A suggested timeline:

- **Three months** before the event, the organizers should finalize the competition date, ideate challenges, and reach out to sponsors. The event should also be registered on CTFtime (see [CTFtime](#ctftime) for more information).
- **Two months** before the event, challenge development should begin.
- **Two weeks** before the event, challenge testing and platform setup should begin. Internal playtesting, challenge revisions, and infrastructure testing should also be conducted.
- **One week** before the event, public announcements should go out, registration should open, and the Discord server should be prepared to receive participants. By now, all challenges should be finalized.

## CTFtime

[CTFtime](https://ctftime.org) is the central hub for tracking CTF events, participating teams, and related information. It's the most effective way to promote a CTF to the broader community and to verify that a planned date does not conflict with other events.

:::note[Regarding conflicts]
Be sure that your event does not conflict with very large events on CTFtime (e.g., qualifiers for on-site finals, events with large cash incentive).
:::

To list your CTF on CTFtime, you need to complete three steps:

1. [Create your team](https://ctftime.org/team/new/). A team can both partake and organize CTFs.
2. [Register your event](https://ctftime.org/event/mail/). This creates an entry for your recurring CTF series, such as "My CTF." Event registration must be reviewed and manually approved by the CTFtime team, so be sure to start this process early, well before your event date, to ensure your listing appears in time.
3. [Add an edition of your event](https://ctftime.org/event/new/). Each instance of your CTF (for example, "My CTF 2026" held on April 1st, 2026) is considered an edition. Once your event is registered and approved, you can add a new edition for each specific competition date.

After the CTF wraps up, upload the final scoreboard to the event page. This is what gives participating teams the points that contribute to their global ranking. The more editions an event has run, the [higher weight](https://ctftime.org/faq/#weight-vote) it can earn from competitor votes.

:::note
Additional information regarding CTF organization is available on CTFtime's [organizer resources page](https://ctftime.org/for-organizers/).
:::

## Homepage

The homepage is the first thing participants see. It should cover event timing, rules, prizes, sponsors, and anything else worth surfacing up front.

### Rules

Clear rules keep the competition fair and set participant expectations. An example ruleset:

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
\*Team size limits are typically unenforceable. rCTF uses a shared "team token" authentication model rather than individual user accounts. All team members log in using the same token, meaning there is no concept of individual users, but rather a collective team identity.
:::

### Sponsorships and prizes

Most competitions provide prizes for the top three teams, even though prizes aren't strictly mandatory. Some events also award prizes for outstanding write-ups, which double as learning resources for the community. Funding for prizes usually comes from sponsorships with companies, organizations, or individuals.

A few rules of thumb when seeking sponsorships:

- Start reaching out well in advance (the above [timeline](#timeline) suggests 2-3 months). Companies often need time to evaluate and confirm sponsorship arrangements.
- Prepare a sponsorship proposal document that outlines the benefits of sponsoring the event. These usually include multiple sponsorship tiers and options.
- Tap into existing relationships with companies or organizations that have sponsored similar events in the past.

The following are potential sponsors to consider:

- [OtterSec](https://osec.io/ctf)
- [GCP credits for CTF infrastructure by Google](https://goo.gle/ctfsponsorship)
- Additional sponsors may be identified by reviewing the sponsor lists of [upcoming](https://ctftime.org/event/list/upcoming) and [past](https://ctftime.org/event/list/past) CTF events.

In exchange for sponsorship, sponsors typically expect certain benefits. These may include:

- Logo placement on the CTF homepage and merchandise, if applicable
- Shoutouts on social media and announcement channels
- Special usage of particular frameworks or tools for challenges or infrastructure
- Guest authorship for challenges
- If your event is held in a physical location, the ability to speak at the event or run a booth, if applicable

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

Expect a lot of support requests from participants during the CTF. Handling them in one central server is far easier than chasing direct messages. Typical requests cover platform issues, broken challenges, incorrect flags, and hint requests.

### Hints

:::caution[No-hint policy]
Enforce a strict no-hint policy. Giving hints to individual teams looks like favoritism in what is, at the end of the day, a competition.
:::

If a participant asks about a particular challenge, organizers should only confirm that the challenge infrastructure and reference solution still work (usually by running the reference exploit). Don't disclose anything else about the challenge.

If hints or clarifications become necessary, see the [hint policy section](/docs/meta/running-a-successful-ctf/during-ctf#hint-policy) for more information.
