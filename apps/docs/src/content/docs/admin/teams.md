---
title: Teams
description: Managing teams and users in rCTF.
order: 3
---

rCTF uses a team-based model where each team shares one login token. The admin panel gives you tools for viewing, searching, and managing teams.

## Listing and searching teams

The admin panel lets you browse all registered teams with their scores, paginate through them, and search by name.

## Team tokens

Each team authenticates with a shared team token. Admins can generate a new login token for any non-privileged team. Useful for getting teams back in when they've lost access to their account.

## Divisions

Teams pick a division at registration. Divisions are configured in the `<red>divisions</red>` config option:

```yaml
divisions:
  open: Open
  student: Student
defaultDivision: open
```

You can restrict which divisions are available based on email with [division ACLs](/configuration#division-acls).

## Team members

When `<red>userMembers</red>` is enabled in the configuration (which is the default), teams can add members by email. This is purely informational, and members share the same team token.

| Setting                  | Default     | Description                 |
| ------------------------ | ----------- | --------------------------- |
| `<red>userMembers</red>` | `true{:ts}` | Enable team members feature |
| `<red>maxMembers</red>`  | `50{:ts}`   | Maximum members per team    |

## Account requirements

Every user account must have at least one authentication method:

- An **email** address, used for registration, recovery, and email-based features.
- A **CTFtime ID**, used for CTFtime OAuth authentication.

A user can't remove their email if they have no CTFtime ID linked, and vice versa.
