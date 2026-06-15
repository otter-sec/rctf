---
title: "Admin"
description: "Challenge management, uploads, teams, verifications, submissions, settings, and admin bot service routes."
order: 14
scroll: true
aside: true
---

:::aside
  

::route-list-item{title="Admin challenge list" method="GET" path="/api/[v2,v1]/admin/challs" href="/docs/api/admin/challenge-list/"}

::route-list-item{title="Admin challenge detail" method="GET" path="/api/[v2,v1]/admin/challs/:id" href="/docs/api/admin/challenge-detail/"}

::route-list-item{title="Create or update challenge" method="PUT" path="/api/[v2,v1]/admin/challs/:id" href="/docs/api/admin/challenge-update/"}

::route-list-item{title="Delete a solve" method="DELETE" path="/api/v2/admin/challs/:challengeId/solves/:userId" href="/docs/api/admin/challenge-delete-solve/"}

::route-list-item{title="Delete a challenge" method="DELETE" path="/api/v1/admin/challs/:id" href="/docs/api/admin/challenge-delete/"}

::route-list-item{title="Upload files" method="POST" path="/api/[v2,v1]/admin/upload" href="/docs/api/admin/upload/"}

::route-list-item{title="Query uploads" method="POST" path="/api/[v2,v1]/admin/upload/query" href="/docs/api/admin/upload-query/"}

::route-list-item{title="List teams" method="GET" path="/api/v2/admin/users" href="/docs/api/admin/teams/"}

::route-list-item{title="Filter teams" method="POST" path="/api/v2/admin/users" href="/docs/api/admin/team-filter/"}

::route-list-item{title="Team detail" method="GET" path="/api/v2/admin/users/:id" href="/docs/api/admin/team-detail/"}

::route-list-item{title="Update team" method="PUT" path="/api/v2/admin/users/:id" href="/docs/api/admin/team-update/"}

::route-list-item{title="Delete team" method="DELETE" path="/api/v2/admin/users/:id" href="/docs/api/admin/team-delete/"}

::route-list-item{title="Create team token" method="POST" path="/api/v2/admin/users/:id/token" href="/docs/api/admin/team-token/"}

::route-list-item{title="Pending verifications" method="GET" path="/api/v2/admin/user-verifications" href="/docs/api/admin/verifications/"}

::route-list-item{title="Complete verification" method="POST" path="/api/v2/admin/user-verifications/:id/complete" href="/docs/api/admin/verification-complete/"}

::route-list-item{title="Resend verification" method="POST" path="/api/v2/admin/user-verifications/:id/resend" href="/docs/api/admin/verification-resend/"}

::route-list-item{title="List submissions" method="GET" path="/api/v2/admin/submissions" href="/docs/api/admin/submissions/"}

::route-list-item{title="Filter submissions" method="POST" path="/api/v2/admin/submissions" href="/docs/api/admin/submission-filter/"}

::route-list-item{title="Read settings" method="GET" path="/api/v2/admin/settings" href="/docs/api/admin/settings/"}

::route-list-item{title="Update settings" method="PUT" path="/api/v2/admin/settings" href="/docs/api/admin/settings-update/"}

::route-list-item{title="Instancer schema" method="GET" path="/api/v2/admin/instancer/schema" href="/docs/api/admin/instancer-schema/"}

::route-list-item{title="Admin bot status" method="GET" path="/api/v2/admin/admin-bot/status" href="/docs/api/admin/admin-bot-status/"}

::route-list-item{title="Pull admin bot job" method="POST" path="/api/v2/admin/admin-bot/jobs/pull" href="/docs/api/admin/admin-bot-pull/"}

::route-list-item{title="Admin bot source" method="GET" path="/api/v2/admin/admin-bot/challenges/:id/source" href="/docs/api/admin/admin-bot-source/"}

::route-list-item{title="Complete admin bot job" method="POST" path="/api/v2/admin/admin-bot/jobs/:id/complete" href="/docs/api/admin/admin-bot-complete/"}

::route-list-item{title="Fail admin bot job" method="POST" path="/api/v2/admin/admin-bot/jobs/:id/fail" href="/docs/api/admin/admin-bot-fail/"}

::route-list-item{title="Admin bot queue depth" method="GET" path="/api/v2/admin/admin-bot/queue-depth" href="/docs/api/admin/admin-bot-queue-depth/"}

::route-list-item{title="List external-auth clients" method="GET" path="/api/v2/admin/external-auth/clients" href="/docs/api/admin/external-auth-list/"}

::route-list-item{title="Create external-auth client" method="POST" path="/api/v2/admin/external-auth/clients" href="/docs/api/admin/external-auth-create/"}

::route-list-item{title="Delete external-auth client" method="DELETE" path="/api/v2/admin/external-auth/clients/:id" href="/docs/api/admin/external-auth-delete/"}
  

:::

These admin API pages cover challenge data, uploads, teams, pending email verifications, submission audit rows, runtime settings, admin bot service work, and external-auth client registration. Most user facing admin routes need a user auth token with the listed permission bits. Admin bot service routes use the shared admin bot bearer token instead. The end-user side of the external-auth flow lives under [External auth](/docs/api/external-auth/).

Permissions, captcha actions, and rate limit conventions are documented in the [API overview](/docs/api/).

### Permissions

| Permission | Used by |
| --- | --- |
| `challsRead{:ts}` | Reading admin challenge data, upload state, instancer schemas, admin bot status, and admin user solve history. |
| `challsWrite{:ts}` | Updating challenges and uploading files. |
| `challsSolveWrite{:ts}` | Removing solves. |
| `usersWrite{:ts}` | Listing and editing teams, creating team tokens, managing pending verifications, and reading submission audit rows. |
| `settingsWrite{:ts}` | Reading and updating runtime settings. |

When a route lists more than one permission bit, the token needs every listed bit.
