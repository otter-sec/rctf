---
title: "<route>POST</route> Log in"
description: "<route>POST /api/v1/auth/login</route>"
order: 5
---

:::aside

::route-example{def="LoginRoute" pick="teamToken" extra="BadJson,BadBody"}

:::

::route-meta{def="LoginRoute"}

Exchanges a longer lived team credential for an auth token that can be used on user routes. This V1 route is still current because there is no V2 replacement for team token login.

::request-body{def="LoginRoute" title="Request body"}

`teamToken` is parsed as `TokenKind.Team{:ts}`. `ctftimeToken` is parsed as `TokenKind.CtftimeAuth{:ts}` and then matched to a team linked to that CTFtime ID.

#### Response

A successful login returns `<response>200 goodLogin</response>` with a fresh `authToken`. Token verification happens before any account data is returned, so expired, malformed, or unrecognized handoff tokens never mint an auth token.

::response-body{def="LoginRoute" response="goodLogin" title="Response fields"}
