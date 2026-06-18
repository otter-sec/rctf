---
title: After the CTF
description: Post-CTF tasks including uploading scoreboards to CTFtime, distributing prizes, collecting feedback, and tearing down infrastructure.
order: 6
---

After the competition wraps up, a handful of administrative tasks remain. This section covers scoreboard submission to CTFtime, prize distribution, feedback collection, [archiving](#archive-the-platform), and infrastructure teardown.

## Uploading scoreboard to CTFtime

Submitting the final scoreboard to CTFtime is what gives participating teams their ranking points. The procedure below exports the scoreboard in the format CTFtime expects.

:::steps
1. **Update admin permissions**

   The CTFtime export endpoint requires the `<red>leaderboardRead</red>` (`4{:ts}`) permission. If the admin account was already provisioned with full perms (`63{:ts}`) during initial setup, this step is a no-op. Otherwise see [Administration › Permissions](/admin#permissions) for the full table and the exact SQL to run. The snippet for granting CTFtime-export-capable perms is:

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

   ```console
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

For competitions with prizes, look up the winning teams in the admin panel's [teams view](/admin/teams), which lists every team with its email and division, and supports name search and pagination. This is more reliable than accepting claims via Discord, as team membership cannot be externally verified.

For divisional prizes, filter the list by division in the same view.

## Feedback collection

A post-competition feedback form (e.g., Google Forms) gives you real signal for future events. Worth asking about:

| Category       | Topics to address                                                    |
| -------------- | -------------------------------------------------------------------- |
| Infrastructure | Platform stability, challenge availability, response times           |
| Challenges     | Difficulty balance, category distribution, quality of problem design |
| Organization   | Communication clarity, support responsiveness, overall experience    |

:::tip
Participant feedback is the best signal for what to change next time. Read through the responses before planning the next edition.
:::

## Writeup collection

Encouraging participants to publish writeups gives back to the broader CTF community and creates learning material for future competitors. Some approaches:

- Announce a deadline for writeup submissions (typically one to two weeks after the event).
- Offer incentives such as prizes for outstanding writeups or recognition in official channels.
- Compile and share links to community writeups in the Discord server or on the event website.
- Release official writeups for challenges that received few or no community solutions.

## Archive the platform

Before decommissioning anything, run an archive of the live instance. rCTF ships a [static export tool](/archiving) that snapshots challenges, scoreboard, and team pages into a read-only site you can host on any static-file backend (S3, GitHub Pages, Netlify, plain nginx, and so on). Once the snapshot is up, participants can still browse the final standings and revisit challenge metadata long after the live platform is gone, which is the right time to also link writeups against permanent URLs.

See [Archiving](/archiving) for the export commands and hosting tips. We recommend doing this **before** the teardown checklist below.

## Infrastructure teardown

When to tear infrastructure down depends on a few things, like remaining budget, whether you want to keep challenges accessible for writeup authors, and how much operational work you're willing to keep doing. Most organizers scale things down shortly after the competition ends, but keep minimal services running for a few days so participants can verify their solutions.

For infrastructure paid for by cloud-provider credits (e.g., Google Cloud), services can stay up until the credits run out, as long as no sensitive data is at risk.

:::warning[Teardown checklist]
Decommission the following resources so you don't get hit with unexpected costs:

- Publish the static archive (see [Archiving](/archiving)) before deleting anything else.
- Take down the CTF platform, and back up the database and configuration before deletion to simplify setup for future events.
- Remove challenge infrastructure: kCTF clusters and any VPS instances used for shared remotes, plus the [Docker instancer](/integrations/instancer/docker) or [Kubernetes instancer](/integrations/instancer/kubernetes) deployment (including the GKE cluster, Traefik, and the ACME wildcard secret).
- Remove the [admin bot](/integrations/admin-bot) worker(s) and any queue/scraper sidecars if you deployed an autoscaled fleet.
- For cloud services, delete static IP addresses, DNS records, load balancers, and any remaining storage buckets or artifacts (including the S3/GCS upload bucket if you migrated off the local provider).
- Rotate or revoke any API keys, tokens, or credentials used during the event. This covers rCTF's `<red>tokenKey</red>`, the instancer `<red>authToken</red>`, the admin bot service token, captcha secrets, registry push credentials, and any deploy tokens (e.g. the Konata `<red>RCTF_TOKEN</red>`).
:::
