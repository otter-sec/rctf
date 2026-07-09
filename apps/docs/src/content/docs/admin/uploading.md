---
title: Uploading
description: Uploading challenge files in rCTF.
order: 5
---

Challenge file attachments are uploaded through the admin panel and stored via the configured [upload provider](/providers/uploads).

## Uploading files

When creating or editing a challenge, you can upload several files at once. Each upload returns the SHA256 hash, URL, and file size stored in the challenge data.

## File deduplication

Files are stored by SHA256 hash, so uploading the same contents again returns the existing URL.

## Checking existing uploads

The admin panel can also look up an existing file by its SHA256 hash before uploading it.

## Permissions

All upload operations require the `challsWrite` permission. Querying existing uploads requires `challsRead`.
