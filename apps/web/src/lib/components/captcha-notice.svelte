<script lang="ts">
  import { ProtectedAction } from '@rctf/types'
  import type { ClientConfig } from '@rctf/types'
  import { getCaptchaProvider, isCaptchaProtected } from '$lib/utils/captcha'

  interface Props {
    config: ClientConfig | undefined | null
    action: ProtectedAction
    class?: string
  }

  let { config, action, class: className = '' }: Props = $props()

  const provider = $derived(getCaptchaProvider(config))
  const enabled = $derived(isCaptchaProtected(action, config))
</script>

{#if enabled && provider === 'captcha/recaptcha'}
  <p class={`block text-foreground-l4 text-xs ${className}`}>
    This site is protected by reCAPTCHA. The Google
    <a
      class="text-foreground-prose-link hover:underline"
      href="https://policies.google.com/privacy"
      target="_blank"
      rel="noopener noreferrer">Privacy Policy</a>
    and
    <a
      class="text-foreground-prose-link hover:underline"
      href="https://policies.google.com/terms"
      target="_blank"
      rel="noopener noreferrer">Terms of Service</a>
    apply.
  </p>
{:else if enabled && provider === 'captcha/hcaptcha'}
  <p class={`block text-foreground-l4 text-xs ${className}`}>
    This site is protected by hCaptcha and its
    <a
      class="text-foreground-prose-link hover:underline"
      href="https://www.hcaptcha.com/privacy"
      target="_blank"
      rel="noopener noreferrer">Privacy Policy</a>
    and
    <a
      class="text-foreground-prose-link hover:underline"
      href="https://www.hcaptcha.com/terms"
      target="_blank"
      rel="noopener noreferrer">Terms of Service</a>
    apply.
  </p>
{:else if enabled && provider === 'captcha/turnstile'}
  <p class={`block text-foreground-l4 text-xs ${className}`}>
    This site is protected by Cloudflare Turnstile. The Cloudflare
    <a
      class="text-foreground-prose-link hover:underline"
      href="https://www.cloudflare.com/privacypolicy/"
      target="_blank"
      rel="noopener noreferrer">Privacy Policy</a>
    and
    <a
      class="text-foreground-prose-link hover:underline"
      href="https://www.cloudflare.com/website-terms/"
      target="_blank"
      rel="noopener noreferrer">Terms of Service</a>
    apply.
  </p>
{:else if enabled && provider}
  <p class={`block text-foreground-l4 text-xs ${className}`}>
    This site is protected by a captcha provider <code>{provider}</code>. No idea what are their
    copyrights for this though.
  </p>
{/if}
