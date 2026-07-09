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
| [Admin challenge list](/api/admin/challenge-list/) | `<route>GET /api/[v2,v1]/admin/challs</route>` |
| [Admin challenge detail](/api/admin/challenge-detail/) | `<route>GET /api/[v2,v1]/admin/challs/:id</route>` |
| [Create or update challenge](/api/admin/challenge-update/) | `<route>PUT /api/[v2,v1]/admin/challs/:id</route>` |
| [Delete a solve](/api/admin/challenge-delete-solve/) | `<route>DELETE /api/v2/admin/challs/:challengeId/solves/:userId</route>` |
| [Delete a challenge](/api/admin/challenge-delete/) | `<route>DELETE /api/v1/admin/challs/:id</route>` |
| [Upload files](/api/admin/upload/) | `<route>POST /api/[v2,v1]/admin/upload</route>` |
| [Query uploads](/api/admin/upload-query/) | `<route>POST /api/[v2,v1]/admin/upload/query</route>` |
| [List teams](/api/admin/teams/) | `<route>GET /api/v2/admin/users</route>` |
| [Filter teams](/api/admin/team-filter/) | `<route>POST /api/v2/admin/users</route>` |
| [Team detail](/api/admin/team-detail/) | `<route>GET /api/v2/admin/users/:id</route>` |
| [Update team](/api/admin/team-update/) | `<route>PUT /api/v2/admin/users/:id</route>` |
| [Delete team](/api/admin/team-delete/) | `<route>DELETE /api/v2/admin/users/:id</route>` |
| [Create team token](/api/admin/team-token/) | `<route>POST /api/v2/admin/users/:id/token</route>` |
| [Pending verifications](/api/admin/verifications/) | `<route>GET /api/v2/admin/user-verifications</route>` |
| [Complete verification](/api/admin/verification-complete/) | `<route>POST /api/v2/admin/user-verifications/:id/complete</route>` |
| [Resend verification](/api/admin/verification-resend/) | `<route>POST /api/v2/admin/user-verifications/:id/resend</route>` |
| [List submissions](/api/admin/submissions/) | `<route>GET /api/v2/admin/submissions</route>` |
| [Filter submissions](/api/admin/submission-filter/) | `<route>POST /api/v2/admin/submissions</route>` |
| [Read settings](/api/admin/settings/) | `<route>GET /api/v2/admin/settings</route>` |
| [Update settings](/api/admin/settings-update/) | `<route>PUT /api/v2/admin/settings</route>` |
| [Instancer schema](/api/admin/instancer-schema/) | `<route>GET /api/v2/admin/instancer/schema</route>` |
| [Admin bot status](/api/admin/admin-bot-status/) | `<route>GET /api/v2/admin/admin-bot/status</route>` |
| [Pull admin bot job](/api/admin/admin-bot-pull/) | `<route>POST /api/v2/admin/admin-bot/jobs/pull</route>` |
| [Admin bot source](/api/admin/admin-bot-source/) | `<route>GET /api/v2/admin/admin-bot/challenges/:id/source</route>` |
| [Complete admin bot job](/api/admin/admin-bot-complete/) | `<route>POST /api/v2/admin/admin-bot/jobs/:id/complete</route>` |
| [Fail admin bot job](/api/admin/admin-bot-fail/) | `<route>POST /api/v2/admin/admin-bot/jobs/:id/fail</route>` |
| [Admin bot queue depth](/api/admin/admin-bot-queue-depth/) | `<route>GET /api/v2/admin/admin-bot/queue-depth</route>` |
| [List external-auth clients](/api/admin/external-auth-list/) | `<route>GET /api/v2/admin/external-auth/clients</route>` |
| [Create external-auth client](/api/admin/external-auth-create/) | `<route>POST /api/v2/admin/external-auth/clients</route>` |
| [Delete external-auth client](/api/admin/external-auth-delete/) | `<route>DELETE /api/v2/admin/external-auth/clients/:id</route>` |

:::

These admin API pages cover challenges, uploads, teams, email verification, submission logs, runtime settings, admin bot work, and external auth clients. Most user-facing routes require a user auth token with the listed permission bits. Admin bot service routes use the shared admin bot bearer token. See [External auth](/api/external-auth/) for the user-facing half of the external auth flow.

Permissions, captcha actions, and rate limit conventions are documented in the [API overview](/api/).

### Permissions

| Permission | Used by |
| --- | --- |
| `challsRead{:ts}` | Reading admin challenge data, upload state, instancer schemas, admin bot status, and admin user solve history. |
| `challsWrite{:ts}` | Updating challenges and uploading files. |
| `challsSolveWrite{:ts}` | Removing solves. |
| `usersWrite{:ts}` | Listing and editing teams, creating team tokens, managing pending verifications, and reading submission audit rows. |
| `settingsWrite{:ts}` | Reading and updating runtime settings. |

When a route lists more than one permission bit, the token needs every listed bit.
