<script lang="ts">
  import type { ClientConfig, ProtectedAction } from '@rctf/types'
  import { isCaptchaProtected } from '$lib/utils/captcha'

  type Props = {
    config: ClientConfig | undefined | null
    action: ProtectedAction
  }

  let { config, action }: Props = $props()

  const provider = $derived(config?.captcha?.provider)
</script>

{#if isCaptchaProtected(action, config)}
  <captcha-notice>
    {#if provider === 'captcha/recaptcha'}
      This site is protected by reCAPTCHA. The Google
      <a
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noopener noreferrer"
      >
        Privacy Policy
      </a>
      and
      <a
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noopener noreferrer"
      >
        Terms of Service
      </a>
      apply.
    {:else if provider === 'captcha/hcaptcha'}
      This site is protected by hCaptcha and its
      <a
        href="https://www.hcaptcha.com/privacy"
        target="_blank"
        rel="noopener noreferrer"
      >
        Privacy Policy
      </a>
      and
      <a
        href="https://www.hcaptcha.com/terms"
        target="_blank"
        rel="noopener noreferrer"
      >
        Terms of Service
      </a>
      apply.
    {:else if provider === 'captcha/turnstile'}
      This site is protected by Cloudflare Turnstile. The Cloudflare
      <a
        href="https://www.cloudflare.com/privacypolicy/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Privacy Policy
      </a>
      and
      <a
        href="https://www.cloudflare.com/website-terms/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Terms of Service
      </a>
      apply.
    {:else}
      This site is protected by a captcha provider {provider}. No idea what are
      their copyrights for this though.
    {/if}
  </captcha-notice>
{/if}

<style>
  captcha-notice {
    display: block;
    font-size: 0.75rem;
    color: var(--foreground-l4);
    text-align: center;
    text-wrap: balance;

    a {
      --underline: currentColor;
    }
  }
</style>
