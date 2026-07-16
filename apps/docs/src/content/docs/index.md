---
title: rCTF
description: An open-source platform for hosting capture-the-flag competitions.
---

<link rel="preload" as="image" href="/static/banner-light.svg" media="(prefers-color-scheme: light)" />
<link rel="preload" as="image" href="/static/banner-dark.svg" media="(prefers-color-scheme: dark)" />
<img class="banner-light" src="/static/banner-light.svg" alt="rCTF" width="2200" height="560" />
<img class="banner-dark" src="/static/banner-dark.svg" alt="rCTF" width="2200" height="560" />

<style>
  .banner-light,
  .banner-dark {
    inline-size: 100%;
    block-size: auto;
    margin-block-end: 1em;
    color: transparent;
    border-radius: var(--radius-lg);
  }
  .banner-dark {
    display: none;
  }
  :root[data-theme='dark'] .banner-light {
    display: none;
  }
  :root[data-theme='dark'] .banner-dark {
    display: block;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme]) .banner-light {
      display: none;
    }
    :root:not([data-theme]) .banner-dark {
      display: block;
    }
  }
</style>

rCTF is an open-source platform for hosting capture-the-flag competitions. It is developed and maintained by the [OtterSec](https://osec.io) team and has supported public events with thousands of teams.

To view a live demo, visit [demo.rctf.osec.io](https://demo.rctf.osec.io/).

::::card-grid
:::card[Installation]{href=/installation}
Install rCTF with the Docker setup script, or follow the manual setup when you need more control.
:::
:::card[Configuration]{href=/configuration}
Find the available config options and environment overrides, with defaults and working examples.
:::
:::card[Providers]{href=/providers}
Use providers to choose how rCTF sends email, stores uploads, scores challenges, and connects to event services.
:::
:::card[Administration]{href=/admin}
Set admin permissions, manage challenges and teams, review submissions, and change event settings.
:::
:::card[API reference]{href=/api}
Build against the v1 and v2 APIs with typed routes, authentication rules, response formats, and rate limits.
:::
:::card[Theming]{href=/theming}
Customize the web app through its Radix colors, category styles, and reusable Svelte components.
:::
::::
