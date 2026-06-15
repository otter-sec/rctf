---
title: "GET List team members"
description: "GET /api/v1/users/me/members"
order: 9
---

:::aside

::route-example{def="GetMembersRoute"}

:::

::route-meta{def="GetMembersRoute"}

This route lists informational team member email rows under the authenticated team account. Team member rows do not create separate login identities.

It is available in V1. When `userMembers` is disabled, the route returns `<response>404 badEndpoint</response>`.

::response-body{def="GetMembersRoute" response="goodMemberData" title="Response fields"}
