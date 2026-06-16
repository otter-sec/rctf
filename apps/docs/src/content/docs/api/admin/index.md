---
title: "Admin"
description: "Challenge management, uploads, teams, verifications, submissions, settings, and admin bot service routes."
order: 14
scroll: true
aside: true
---

:::aside

| Route | Endpoint |
| --- | --- |
| [Admin challenge list](/docs/api/admin/challenge-list/) | `<route>GET /api/[v2,v1]/admin/challs</route>` |
| [Admin challenge detail](/docs/api/admin/challenge-detail/) | `<route>GET /api/[v2,v1]/admin/challs/:id</route>` |
| [Create or update challenge](/docs/api/admin/challenge-update/) | `<route>PUT /api/[v2,v1]/admin/challs/:id</route>` |
| [Delete a solve](/docs/api/admin/challenge-delete-solve/) | `<route>DELETE /api/v2/admin/challs/:challengeId/solves/:userId</route>` |
| [Delete a challenge](/docs/api/admin/challenge-delete/) | `<route>DELETE /api/v1/admin/challs/:id</route>` |
| [Upload files](/docs/api/admin/upload/) | `<route>POST /api/[v2,v1]/admin/upload</route>` |
| [Query uploads](/docs/api/admin/upload-query/) | `<route>POST /api/[v2,v1]/admin/upload/query</route>` |
| [List teams](/docs/api/admin/teams/) | `<route>GET /api/v2/admin/users</route>` |
| [Filter teams](/docs/api/admin/team-filter/) | `<route>POST /api/v2/admin/users</route>` |
| [Team detail](/docs/api/admin/team-detail/) | `<route>GET /api/v2/admin/users/:id</route>` |
| [Update team](/docs/api/admin/team-update/) | `<route>PUT /api/v2/admin/users/:id</route>` |
| [Delete team](/docs/api/admin/team-delete/) | `<route>DELETE /api/v2/admin/users/:id</route>` |
| [Create team token](/docs/api/admin/team-token/) | `<route>POST /api/v2/admin/users/:id/token</route>` |
| [Pending verifications](/docs/api/admin/verifications/) | `<route>GET /api/v2/admin/user-verifications</route>` |
| [Complete verification](/docs/api/admin/verification-complete/) | `<route>POST /api/v2/admin/user-verifications/:id/complete</route>` |
| [Resend verification](/docs/api/admin/verification-resend/) | `<route>POST /api/v2/admin/user-verifications/:id/resend</route>` |
| [List submissions](/docs/api/admin/submissions/) | `<route>GET /api/v2/admin/submissions</route>` |
| [Filter submissions](/docs/api/admin/submission-filter/) | `<route>POST /api/v2/admin/submissions</route>` |
| [Read settings](/docs/api/admin/settings/) | `<route>GET /api/v2/admin/settings</route>` |
| [Update settings](/docs/api/admin/settings-update/) | `<route>PUT /api/v2/admin/settings</route>` |
| [Instancer schema](/docs/api/admin/instancer-schema/) | `<route>GET /api/v2/admin/instancer/schema</route>` |
| [Admin bot status](/docs/api/admin/admin-bot-status/) | `<route>GET /api/v2/admin/admin-bot/status</route>` |
| [Pull admin bot job](/docs/api/admin/admin-bot-pull/) | `<route>POST /api/v2/admin/admin-bot/jobs/pull</route>` |
| [Admin bot source](/docs/api/admin/admin-bot-source/) | `<route>GET /api/v2/admin/admin-bot/challenges/:id/source</route>` |
| [Complete admin bot job](/docs/api/admin/admin-bot-complete/) | `<route>POST /api/v2/admin/admin-bot/jobs/:id/complete</route>` |
| [Fail admin bot job](/docs/api/admin/admin-bot-fail/) | `<route>POST /api/v2/admin/admin-bot/jobs/:id/fail</route>` |
| [Admin bot queue depth](/docs/api/admin/admin-bot-queue-depth/) | `<route>GET /api/v2/admin/admin-bot/queue-depth</route>` |
| [List external-auth clients](/docs/api/admin/external-auth-list/) | `<route>GET /api/v2/admin/external-auth/clients</route>` |
| [Create external-auth client](/docs/api/admin/external-auth-create/) | `<route>POST /api/v2/admin/external-auth/clients</route>` |
| [Delete external-auth client](/docs/api/admin/external-auth-delete/) | `<route>DELETE /api/v2/admin/external-auth/clients/:id</route>` |

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
