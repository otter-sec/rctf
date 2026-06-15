---
title: "Users"
description: "API reference for public profiles, self profiles, profile updates, avatars, email auth, CTFtime auth, and team members."
order: 13
scroll: true
aside: true
---

:::aside
  

::route-list-item{title="Public profile" method="GET" path="/api/[v2,v1]/users/:id" href="/docs/api/users/profile/"}

::route-list-item{title="Own profile" method="GET" path="/api/[v2,v1]/users/me" href="/docs/api/users/self/"}

::route-list-item{title="Update profile" method="PATCH" path="/api/[v2,v1]/users/me" href="/docs/api/users/update/"}

::route-list-item{title="Update avatar" method="PATCH" path="/api/v2/users/me/avatar" href="/docs/api/users/avatar/"}

::route-list-item{title="Set email auth" method="PUT" path="/api/[v2,v1]/users/me/auth/email" href="/docs/api/users/email/"}

::route-list-item{title="Remove email auth" method="DELETE" path="/api/v1/users/me/auth/email" href="/docs/api/users/delete-email/"}

::route-list-item{title="Set CTFtime auth" method="PUT" path="/api/v1/users/me/auth/ctftime" href="/docs/api/users/ctftime/"}

::route-list-item{title="Remove CTFtime auth" method="DELETE" path="/api/v1/users/me/auth/ctftime" href="/docs/api/users/delete-ctftime/"}

::route-list-item{title="List team members" method="GET" path="/api/v1/users/me/members" href="/docs/api/users/members/"}

::route-list-item{title="Add a team member" method="POST" path="/api/v1/users/me/members" href="/docs/api/users/create-member/"}

::route-list-item{title="Remove a team member" method="DELETE" path="/api/v1/users/me/members/:id" href="/docs/api/users/delete-member/"}
  

:::

User routes cover public team profiles and authenticated account settings. V2 includes avatar, country, and status fields. V1 is still used for team members and CTFtime account links.

Public profile routes are available after the CTF starts. Admin tokens with `challsRead{:ts}` can read public profiles before that gate opens because profile responses include solve data.

When both V1 and V2 exist for the same action, V2 is usually the best fit for new clients. The V1 account management routes remain useful where there is no V2 route.

## Profile data

Public profiles include the team name, division, score, rank fields, CTFtime ID when linked, and visible solves. V2 also includes avatar URL, country or region code, status text, and `bloodIndex` on solve rows.

The own profile routes include private account fields as well, such as the team ID, email address, team token, allowed divisions, and admin permission bitmask when present.

## Account updates

Profile updates can change the team name and division. V2 can also update country or region code and status text. Name updates use a per user rate limit bucket.

Email auth may involve a verification email, depending on provider configuration. CTFtime auth and team member management are available through V1 routes.
