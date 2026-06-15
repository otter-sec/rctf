---
title: API
description: HTTP reference for the example service.
order: 6
scroll: true
aside: true
---

The API is a small JSON-over-HTTP surface. Every route returns the same
envelope — a `kind` discriminator beside a `data` payload — so success and
failure share one shape and one parser.

Authenticate by sending a bearer token in the `Authorization` header. The base
URL is `https://api.example.com/v1`, and every request and response body is
`application/json`.

This section is a [scroll group](/docs/writing) rendered in reference layout:
the routes read as one continuous document, and each one pins its example
request alongside the prose until you scroll into the next.
