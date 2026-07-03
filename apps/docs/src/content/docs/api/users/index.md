---
title: "Users"
description: "API reference for public profiles, self profiles, profile updates, avatars, email auth, CTFtime auth, and team members."
order: 13
scroll: true
aside: true
---

:::aside

| Route | Endpoint |
| --- | --- |
| [Public profile](/api/users/profile/) | `<route>GET /api/[v2,v1]/users/:id</route>` |
| [Own profile](/api/users/self/) | `<route>GET /api/[v2,v1]/users/me</route>` |
| [Update profile](/api/users/update/) | `<route>PATCH /api/[v2,v1]/users/me</route>` |
| [Update avatar](/api/users/avatar/) | `<route>PATCH /api/v2/users/me/avatar</route>` |
| [Set email auth](/api/users/email/) | `<route>PUT /api/[v2,v1]/users/me/auth/email</route>` |
| [Remove email auth](/api/users/delete-email/) | `<route>DELETE /api/v1/users/me/auth/email</route>` |
| [Set CTFtime auth](/api/users/ctftime/) | `<route>PUT /api/v1/users/me/auth/ctftime</route>` |
| [Remove CTFtime auth](/api/users/delete-ctftime/) | `<route>DELETE /api/v1/users/me/auth/ctftime</route>` |
| [List team members](/api/users/members/) | `<route>GET /api/v1/users/me/members</route>` |
| [Add a team member](/api/users/create-member/) | `<route>POST /api/v1/users/me/members</route>` |
| [Remove a team member](/api/users/delete-member/) | `<route>DELETE /api/v1/users/me/members/:id</route>` |

:::

User routes cover public team profiles and authenticated account settings. V2 includes avatar, country, and status fields. V1 is still used for team members and CTFtime account links.

Public profile routes are available after the CTF starts. Admin tokens with `challsRead{:ts}` can read public profiles before that gate opens because profile responses include solve data.

When both V1 and V2 exist for the same action, V2 is usually the best fit for new clients. The V1 account management routes remain useful where there is no V2 route.

## Profile data

Public profiles include the team name, division, score, rank fields, CTFtime ID when linked, and visible solves. V2 also includes avatar URL, country or region code, status text, and `bloodIndex` on solve rows.

The own profile routes include private account fields as well, such as the team ID, email address, team token, allowed divisions, and admin permission bitmask when present.

## Account updates

Profile updates can change the team name and division. V2 can also update country or region code and status text. Every profile update consumes from a per user rate limit bucket, regardless of which fields are present.

Email auth may involve a verification email, depending on provider configuration. CTFtime auth and team member management are available through V1 routes.
