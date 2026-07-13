---
title: During the CTF
description: Operational procedures for monitoring, incident response, and issue resolution during an active CTF competition.
order: 5
---

During the event, the team needs to watch the platform, respond to failures, and make consistent decisions about broken challenges and hints.

## Monitoring

Monitor the services participants depend on and alert someone who can act when they fail.

### Infrastructure monitoring

Monitor the following components throughout the competition:

- For the **rCTF API**, watch error rates, latency, CPU, and memory.
- For **PostgreSQL**, watch connection usage, slow queries, and disk space. A steadily rising connection count can point to a leak.
- For **Redis**, watch memory and connected clients. If Redis fails, leaderboard caching and rate limiting are affected.
- For **challenge containers**, watch CPU, memory, network traffic, restarts, and disk use.
- For the **reverse proxy**, watch request volume, 5xx responses, and latency. If Cloudflare is in front, include its traffic and DDoS dashboards.

:::tip
Use an external uptime monitor such as [UptimeRobot](https://uptimerobot.com/) or [Hetrix Tools](https://hetrixtools.com/) so a total outage still produces an alert.
:::

### Staffing and shift coverage

For events longer than 12 hours, rotate shifts and keep someone with infrastructure access on call at all times. When a challenge author is offline, the support team should still have the reference solution and enough notes to investigate tickets.

## Incident response

Decide who can change infrastructure, challenges, and the event schedule before an incident happens.

### Challenge outages

If a challenge becomes unavailable, the response depends on the deployment method:

- For **Docker containers**, check container status with `$ <red>docker</red> ps` and logs with `$ <red>docker</red> logs <container>`. Restart with `$ <red>docker</red> compose up <dim>-d</dim> <dim>--force-recreate</dim> <service>` if needed.
- For **instancer-managed challenges**, verify the instancer service is running and reachable. Check the instancer logs for errors. If individual instances are failing, the issue may be with the challenge image itself rather than the instancer.
- For **static challenges** (no remote), verify that challenge files are accessible through the upload provider. If using S3/GCS, check bucket permissions and CDN status.

After the fix is tested, announce that the challenge is available again and say whether its files or behavior changed.

### Platform issues

If the rCTF platform itself becomes unresponsive, work through the following steps:

1. **Check API server logs** for crash traces, out-of-memory errors, or unhandled exceptions. If using Docker, run `$ <red>docker</red> logs rctf-rctf-1`.
2. **Verify database connectivity** by ensuring PostgreSQL is running and accepting connections. Check for connection pool exhaustion or long-running queries with `$ <red>docker</red> exec <dim>-it</dim> rctf-postgres-1 <red>psql</red> <dim>-U</dim> rctf <dim>-c</dim> <green>"SELECT count(*) FROM pg_stat_activity;"</green>`.
3. **Verify Redis connectivity** by ensuring Redis is running. Run `$ <red>docker</red> exec <dim>-it</dim> rctf-redis-1 <red>redis-cli</red> <dim>--pass</dim> <green>"<yellow>$RCTF_REDIS_PASSWORD</yellow>"</green> ping`.
4. **Restart the rCTF service** if the issue is not immediately identifiable. Run `$ <red>cd</red> /opt/rctf && <red>docker</red> compose restart rctf`.
5. **Check resource usage** to verify the host has sufficient CPU, memory, and disk space. High leaderboard update frequency or large team counts can increase resource usage.

If an outage materially reduces playing time, extend the event and announce the new end time clearly.

### Security incidents

For security incidents:

- For suspected **flag sharing**, preserve submission times, IP records, and the shared values before deciding on a penalty.
- During a denial-of-service attack, take the affected challenge offline if necessary, preserve logs, and add rate limits or blocks before restoring it.
- If a flag is leaked, rotate it in rCTF and every affected service immediately, then announce any file or service changes participants need to know about.

## Challenge issues

### Broken challenges

If a challenge is reported as broken, verify it first. Have the author run the intended solution against the live deployment. If it's actually broken, work through the following steps:

1. Post an announcement acknowledging the issue and that a fix is in progress.
2. Apply the fix to the challenge.
3. Test the fix before redeploying.
4. Announce when the challenge is back online.

:::warning[Mid-competition modifications]
Be very careful when modifying challenges during the competition, since changes can invalidate progress made by participants. If any team has already solved the challenge, consider it solvable and avoid further modifications unless the challenge is fundamentally broken.
:::

### Unintended solutions

Accept unintended solutions unless they rely on attacking shared infrastructure or another team. Finding a valid path the author missed is part of solving the challenge.

If a deployment mistake exposes the flag directly, fix the original only when necessary for fairness or stability. A separate patched variant can preserve the intended idea, but its release may reveal what was wrong with the first version.

### Attachment updates

If challenge attachments need updates (e.g., typo fixes or missing files), update the attachment and post a clear announcement spelling out what changed. Avoid changes that would invalidate existing progress.

## Hint policy

Do not give private hints. If an unsolved challenge needs help, release the same information to everyone:

1. Around the halfway point of the competition, ask interested participants to open support tickets describing their current progress on unsolved challenges.
2. The challenge author reviews the submitted progress and decides whether a hint is warranted and what to provide.
3. Any approved hints must go out publicly in the `#announcements` channel so all participants have equal access.

:::caution[Post-solve hints]
Once a challenge has been solved, don't release any more hints for it. Doing so would be unfair to teams that solved it without help.
:::

:::tip[Timing considerations]
Account for time zones when scheduling a hint. A release during one region's night gives teams elsewhere more useful playing time with it.
:::

:::note[Beginner-friendly challenges]
Beginner challenges can allow more guidance when their purpose is teaching rather than ranking. State that policy in advance and apply it consistently.
:::

## Announcements

Keep communication with participants clear and timely throughout the competition. Always announce the following:

- Competition start and end reminders
- Challenge releases (if challenges are released in waves)
- Challenge fixes or updates
- Delays or extensions of the competition
- Hint releases
- Infrastructure issues and resolutions
- Survey release
- Writeups release

Keep announcements concise and informative. For time-related announcements, Discord's [timestamp](https://r.3v.fi/discord-timestamps/) formatting handles relative times across time zones.
