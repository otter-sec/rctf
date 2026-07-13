---
title: After the CTF
description: Post-CTF tasks including uploading scoreboards to CTFtime, distributing prizes, collecting feedback, and tearing down infrastructure.
order: 6
---

After the event, submit the scoreboard, contact prize winners, collect feedback and writeups, publish an archive, and remove infrastructure that no longer needs to run.

## Uploading scoreboard to CTFtime

Submitting the final scoreboard to CTFtime is what gives participating teams their ranking points. The procedure below exports the scoreboard in the format CTFtime expects.

:::steps
1. **Update admin permissions**

   The CTFtime export requires `<red>leaderboardRead</red>` (`4{:ts}`). A full admin with permissions `63{:ts}` already has it. Otherwise, grant the permission as described under [Administration › Permissions](/admin#permissions):

   ```sql
   UPDATE users SET perms = 7 WHERE email = '[...]';
   ```

2. **Retrieve authentication token**

   Log in to the CTF platform as the admin account and run the following snippet in the browser's developer console:

   ```js title="Browser console" showLineNumbers=false
   localStorage.getItem('token')
   ```

   Copy the returned authentication token, removing the surrounding quotation marks.

3. **Export the scoreboard**

   Use the following command to retrieve the scoreboard export, replacing `TOKEN` with the authentication token from the previous step:

   ```ansi
   $ <red>curl</red> https://ctf.example.com/api/v1/integrations/ctftime/leaderboard \
     <dim>-H</dim> <green>"Authorization: Bearer TOKEN"</green>
   ```

4. **Submit to CTFtime**

   Submit the command output through the CTFtime event dashboard.

   :::note
   Point distribution can take around an hour for established events. For first-time events, points are awarded only after the one-week weight voting period ends.
   :::
:::

## Prize distribution

Contact winners through the email in the admin [teams view](/admin/teams), not through an unverified Discord account. The same view can filter teams by division for divisional prizes.

## Feedback collection

A short post-event form can show what to keep and what to change. Ask about:

| Category       | Topics to address                                                    |
| -------------- | -------------------------------------------------------------------- |
| Infrastructure | Platform stability, challenge availability, response times           |
| Challenges     | Difficulty balance, category distribution, quality of problem design |
| Organization   | Communication clarity, support responsiveness, overall experience    |

:::tip
Read the responses before planning the next edition, while the incidents and challenge discussions are still fresh.
:::

## Writeup collection

Writeups make the challenges useful after the scoreboard closes. To encourage them:

- Announce a deadline for writeup submissions (typically one to two weeks after the event).
- Offer incentives such as prizes for outstanding writeups or recognition in official channels.
- Compile and share links to community writeups in the Discord server or on the event website.
- Release official writeups for challenges that received few or no community solutions.

## Archive the platform

Before decommissioning the platform, use the [static export tool](/archiving) to preserve challenges, profiles, solves, and the final leaderboard. Host the resulting read-only site wherever you plan to keep permanent links and writeups.

## Infrastructure teardown

Scale expensive infrastructure down soon after the event. If the budget allows, keep challenge services available for a few days so participants can finish writeups and verify solutions.

Cloud credits are not a reason to leave vulnerable or forgotten services running. Keep them only while someone is still monitoring them and no sensitive data or credentials remain exposed.

:::warning[Teardown checklist]
Decommission the following resources so you don't get hit with unexpected costs:

- Publish the static archive (see [Archiving](/archiving)) before deleting anything else.
- Take down the CTF platform, and back up the database and configuration before deletion to simplify setup for future events.
- Remove challenge infrastructure: kCTF clusters and any VPS instances used for shared remotes, plus the [Docker instancer](/integrations/instancer/docker) or [Kubernetes instancer](/integrations/instancer/kubernetes) deployment (including the GKE cluster, Traefik, and the ACME wildcard secret).
- Remove the [admin bot](/integrations/admin-bot) worker(s) and any queue/scraper sidecars if you deployed an autoscaled fleet.
- For cloud services, delete static IP addresses, DNS records, load balancers, and any remaining storage buckets or artifacts (including the S3/GCS upload bucket if you migrated off the local provider).
- Rotate or revoke any API keys, tokens, or credentials used during the event. This covers rCTF's `<red>tokenKey</red>`, the instancer `<red>authToken</red>`, the admin bot service token, captcha secrets, registry push credentials, and any deploy tokens, such as Konata's `<yellow>RCTF_TOKEN</yellow>`.
:::
