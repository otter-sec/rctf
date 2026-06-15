---
title: "GET Client config"
description: "GET /api/[v2,v1]/integrations/client/config"
order: 1
---

:::aside

::::tabs{sync="integrations-client-config-version"}

:::tab[V2]

::route-example{def="GetClientConfigRouteV2"}

:::

:::tab[V1]

::route-example{def="GetClientConfigRoute"}

:::

::::

:::

::route-meta{def="GetClientConfigRouteV2"}

This route provides the public runtime settings used by the web app. It includes display settings, event timing, registration state, division names, and public provider settings.

V2 includes the current captcha and analytics fields, logo URLs, archive state, and instancer availability. V1 remains available for older clients and includes the older `globalSiteTag` and `recaptcha` fields.

::::tabs{sync="integrations-client-config-version"}

:::tab[V2]

::response-body{def="GetClientConfigRouteV2" response="goodClientConfigV2" title="Response fields"}

:::

:::tab[V1]

::response-body{def="GetClientConfigRoute" response="goodClientConfig" title="Response fields"}

:::

::::
