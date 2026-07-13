---
title: Common mistakes
description: Recurring operational and security mistakes for CTF organizers, with rCTF-specific notes on what the platform already handles.
order: 2
scroll: true
---

These problems appear repeatedly in CTF retrospectives. Finding them during planning or testing gives the team time to fix them before participants arrive.

This page focuses on planning and onsite issues, while [Infrastructure](/meta/common-mistakes/infrastructure) and [Challenges](/meta/common-mistakes/challenges) cover the rest.

## Planning

### Not planning properly or not having deadlines

Most event problems get harder to fix when there are no internal deadlines. Challenges can land the night before, infrastructure can still be getting provisioned an hour before opening, solution scripts can be unfinished at start time, and during-event ownership can stay unclear.

Set a few internal dates and treat them as part of the event infrastructure.

1. Stop accepting substantial challenge changes before the event. Small wording fixes and confirmed bug fixes can still happen, but new ideas should not be landing during the final preparation window.

2. Freeze infrastructure, and give production configuration enough time to run without churn. Last-minute DNS, proxy, provider, or cluster changes should be treated as risky.

3. Run a dry-run. Test registration, login, challenge visibility, instance start, flag submission, score updates, and admin triage before participants arrive. The dry-run should use production-like paths, not just local shortcuts.

4. Every challenge should have a during-event owner, and platform operations should have a clear escalation path. When something breaks, the team should already know who is responsible for the first response.

Deadlines also keep the infrastructure owner from getting pulled into last-minute coordination for unrelated delays.

## Onsite

### Connection issues

The venue network is often different from the network used during testing. Rented venues, university lecture halls, and hotel conference rooms may use eduroam, vendor-managed Wi-Fi, captive portals, or enterprise firewalls from vendors like Fortinet, Palo Alto, or Cisco. Finding out about those restrictions on the day of the event leaves no time to adapt.

Ask for the egress firewall vendor, blocked ports, per-AP and per-room bandwidth caps, and whether temporary firewall exceptions are available. Compare bandwidth against the expected laptop count, and test actual challenge solutions end to end on the venue network.

Some managed networks block outbound SSH on TCP port `22`, arbitrary high or low ports, or traffic that looks like tunneling. DPI appliances can pass HTTPS while dropping unrecognized TCP payloads. NAT or CGNAT can also collapse many teams behind one source IP, which makes IP-keyed rate limits hit legitimate traffic. Whitelist the venue egress range or relax the relevant limits for onsite traffic.

:::tip
If the venue cannot provide network details, plan a backup uplink and test it before participants arrive.
:::

### Not enough VPN configs

Onsite CTFs that also allow remote participation sometimes hand out WireGuard or OpenVPN configs so challenge networks are reachable without exposing every service publicly, or to give all participants a shared local network. A pattern we keep seeing: enough configs for a few onsite devices but none for remote players. That forces remote teams to build their own access path, which isn't really a problem in itself but is annoying for players given that VPN config generation is basically free.

Generate configs for all players, not only the people attending onsite. Pre-generate a large pool, such as 100 configs. Bind the VPN endpoint to a public IP, or use a cloud VPS that bridges to the venue network so remote players can reach it over the public internet.
