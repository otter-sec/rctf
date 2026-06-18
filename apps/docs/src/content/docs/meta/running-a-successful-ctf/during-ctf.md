---
title: During the CTF
description: Operational procedures for monitoring, incident response, and issue resolution during an active CTF competition.
order: 5
---

With challenges deployed and the CTF platform live, the competition is ready to start. This section covers monitoring, incident response, and operational guidance for the issues that show up during the event.

## Monitoring

Good monitoring catches issues before they hit participants.

### Infrastructure monitoring

Monitor the following components throughout the competition:

- For the **rCTF platform**, watch API server logs for elevated error rates.
- For **PostgreSQL**, monitor connection pool usage, query latency, and disk space. High connection counts may indicate a connection leak or excessive load.
- For **Redis**, monitor memory usage and connected clients. Redis is used for caching, rate limiting, and leaderboard computation. If Redis becomes unavailable, rate limiting and caching will fail.
- For **challenge containers**, monitor CPU, memory, and network usage for hosted challenges.
- For the **reverse proxy (Nginx)**, monitor request rates, error rates (5xx), and response times. If behind Cloudflare, use the Cloudflare dashboard for DDoS metrics.

:::tip
Consider setting up a simple uptime monitor (e.g., [UptimeRobot](https://uptimerobot.com/), [Hetrix Tools](https://hetrixtools.com/)) that pings your CTF platform and alerts via Discord or email if it goes down.
:::

### Staffing and shift coverage

For competitions running longer than 12 hours, set up a shift rotation so coverage stays continuous. A team spread across time zones can cover the full event without anyone pulling overnight shifts. At minimum, keep at least one person with infrastructure access on call at all times for critical incidents. If a challenge author isn't available, make sure the support team has enough internal documentation to handle tickets on that challenge.

## Incident response

Even with thorough preparation, things will go wrong during the competition. Have clear procedures ready for common incident types.

### Challenge outages

If a challenge becomes unavailable, the response depends on the deployment method:

- For **Docker containers**, check container status with `$ <red>docker</red> ps` and logs with `$ <red>docker</red> logs <container>`. Restart with `$ <red>docker</red> compose up <dim>-d</dim> <dim>--force-recreate</dim> <service>` if needed.
- For **instancer-managed challenges**, verify the instancer service is running and reachable. Check the instancer logs for errors. If individual instances are failing, the issue may be with the challenge image itself rather than the instancer.
- For **static challenges** (no remote), verify that challenge files are accessible through the upload provider. If using S3/GCS, check bucket permissions and CDN status.

Once the issue is fixed, post an announcement in the `#announcements` channel letting participants know the challenge is back online.

### Platform issues

If the rCTF platform itself becomes unresponsive, work through the following steps:

1. **Check API server logs** for crash traces, out-of-memory errors, or unhandled exceptions. If using Docker, run `$ <red>docker</red> logs rctf-rctf-1`.
2. **Verify database connectivity** by ensuring PostgreSQL is running and accepting connections. Check for connection pool exhaustion or long-running queries with `$ <red>docker</red> exec <dim>-it</dim> rctf-postgres-1 psql <dim>-U</dim> rctf <dim>-c</dim> <green>"SELECT count(*) FROM pg_stat_activity;"</green>`.
3. **Verify Redis connectivity** by ensuring Redis is running. Run `$ <red>docker</red> exec <dim>-it</dim> rctf-redis-1 redis-cli --pass "$RCTF_REDIS_PASSWORD" ping`.
4. **Restart the rCTF service** if the issue is not immediately identifiable. Run `$ <red>cd</red> /opt/rctf && <red>docker</red> compose restart rctf`.
5. **Check resource usage** to verify the host has sufficient CPU, memory, and disk space. High leaderboard update frequency or large team counts can increase resource usage.

For extended outages, push the competition end time back to make up for the lost time.

### Security incidents

Security incidents require immediate attention. Common scenarios include the following:

- If evidence of **flag sharing** between teams is identified, document the evidence and consider disqualification.
- If challenge infrastructure is being targeted (e.g., DoS attacks), consider temporarily taking the affected challenge offline and implementing additional rate limiting or IP blocking.
- If a flag is accidentally leaked (e.g., in a public announcement or challenge description), the flag must be rotated immediately. Update the challenge configuration in rCTF and redeploy any affected remote services.

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

Unintended solutions (where participants solve a challenge through a method the author didn't anticipate) are common in CTFs. The usual call is to accept the unintended solution as valid. Penalizing creativity isn't fair to the participants who put in the effort to find an alternative approach.

If the unintended solution trivializes the challenge (e.g., a configuration error exposing the flag directly), consider deploying a "revenge" variant with the vulnerability patched. Be aware that releasing a revenge challenge can inadvertently hint at the nature of the unintended solution.

### Attachment updates

If challenge attachments need updates (e.g., typo fixes or missing files), update the attachment and post a clear announcement spelling out what changed. Avoid changes that would invalidate existing progress.

## Hint policy

As covered in the [prerequisites section](/meta/running-a-successful-ctf/prerequisites#hints), a strict no-hint policy is the default for fairness. That said, structured hint releases can be appropriate for unsolved challenges as the competition progresses. If you release hints, follow this procedure:

1. Around the halfway point of the competition, ask interested participants to open support tickets describing their current progress on unsolved challenges.
2. The challenge author reviews the submitted progress and decides whether a hint is warranted and what to provide.
3. Any approved hints must go out publicly in the `#announcements` channel so all participants have equal access.

:::caution[Post-solve hints]
Once a challenge has been solved, don't release any more hints for it. Doing so would be unfair to teams that solved it without help.
:::

:::tip[Timing considerations]
Participating teams are usually spread across multiple time zones. Releasing a hint during one region's sleeping hours hands the rest an unfair advantage. Where possible, time hint releases for when most participants are likely to be active.
:::

:::note[Beginner-friendly challenges]
For challenges marked as beginner-friendly, giving hints or guidance to novice teams who ask is usually fine. It helps them learn and encourages participation, as long as it doesn't affect the final competition rankings.
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
