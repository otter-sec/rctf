<!--
  Flag submission bar. Renders one rung of the submit ladder (resolveSubmitState,
  first match wins): archived / ended / login / solved / form. The ended rung is
  driven by a client clock ticked every second, and auth is reactive off the
  userSelf query rather than localStorage (KTD-7). A correct or already-solved
  flag calls onSolve so the parent can flip the optimistic solved state.
-->
<script lang="ts">
  import { BadAlreadySolvedChallenge, GoodFlag, SubmitFlagRoute, type Challenge } from '@rctf/types'
  import { showApiError } from '$lib/api'
  import { useApiForm } from '$lib/forms/use-api-form.svelte'
  import IconCheck from '$lib/icons/icon-check.svelte'
  import IconInfoCircleFilled from '$lib/icons/icon-info-circle-filled.svelte'
  import IconLogin from '$lib/icons/icon-login.svelte'
  import IconSend from '$lib/icons/icon-send.svelte'
  import { useClientConfig } from '$lib/query/config'
  import { useCurrentUser } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import Input from '$lib/ui/input.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { resolveSubmitState } from './submit-ladder'

  interface Props {
    challenge: Challenge
    isSolved: boolean
    onSolve: (challengeId: string) => void
  }

  let { challenge, isSolved, onSolve }: Props = $props()

  const configQuery = useClientConfig()
  const clientConfig = $derived(configQuery.data)
  const isArchived = $derived(clientConfig?.isArchived ?? false)
  const flagPlaceholder = $derived(clientConfig?.flagFormatPlaceholder ?? 'flag{...}')

  // Before the config loads there is no end time; Infinity keeps `now > endTime`
  // false so the bar never reads "ended", matching the old app's
  // `clientConfig ? now > endTime : false`.
  const endTime = $derived(clientConfig?.endTime ?? Number.POSITIVE_INFINITY)

  // KTD-7 deviation: auth is reactive off the userSelf query (data is null when
  // signed out, undefined while loading) instead of a synchronous token read.
  const userQuery = useCurrentUser()
  const isAuthenticated = $derived(userQuery.data != null)

  let now = $state(Date.now())

  const submitState = $derived(
    resolveSubmitState({ isArchived, endTime, now, isAuthenticated, isSolved })
  )

  // Canonical 1s ticker; the interval is torn down once the ladder reaches a
  // terminal rung so an ended/archived CTF stops ticking (cf. navigation-countdown).
  $effect(() => {
    if (submitState === 'archived' || submitState === 'ended') return
    const interval = setInterval(() => (now = Date.now()), 1000)
    return () => clearInterval(interval)
  })

  const form = useApiForm(SubmitFlagRoute, {
    onSuccess: response => {
      if (response.kind === GoodFlag.kind) {
        toast.success('Flag correct!')
        onSolve(challenge.id)
        form.setData({ flag: '' })
      } else if (response.kind === BadAlreadySolvedChallenge.kind) {
        toast.info('You already solved this challenge')
        onSolve(challenge.id)
      }
    },
    onError: response => {
      showApiError(response)
    },
  })

  // SubmitFlagRoute carries the challenge id as a path param; keep it on the form
  // payload so submit() targets the selected challenge.
  $effect(() => {
    form.data.id = challenge.id
  })

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    const flag = (form.data.flag ?? '').trim()
    if (!flag) return
    form.setData({ flag })
    form.submit()
  }
</script>

<challenge-submit>
  {#if submitState === 'archived'}
    <submit-notice>
      <IconInfoCircleFilled />
      <span>The CTF is archived.</span>
    </submit-notice>
  {:else if submitState === 'ended'}
    <submit-notice>
      <IconInfoCircleFilled />
      <span>The CTF has ended.</span>
    </submit-notice>
  {:else if submitState === 'login'}
    <Button href="/login">
      <IconLogin />
      Login to submit
    </Button>
  {:else}
    <form onsubmit={handleSubmit}>
      <submit-row>
        {#if submitState === 'solved'}
          <submit-notice data-tone="success">
            <IconCheck />
            <span>Challenge solved!</span>
          </submit-notice>
        {:else}
          <Input
            type="text"
            placeholder={flagPlaceholder}
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            data-flag-input
            aria-label="Flag"
            aria-invalid={!!form.errors._form || undefined}
            disabled={form.submitting}
            bind:value={form.data.flag}
          />
        {/if}
        <button
          type="submit"
          aria-label="Submit flag"
          disabled={form.submitting || submitState === 'solved'}
        >
          {#if form.submitting}
            <Spinner />
          {:else}
            <IconSend />
          {/if}
        </button>
      </submit-row>
    </form>
  {/if}
</challenge-submit>

<style>
  challenge-submit {
    display: block;
    --submit-block-size: 3rem;
  }

  form {
    display: block;
  }

  submit-row {
    display: flex;
    align-items: stretch;
    gap: 0.5rem;
    block-size: var(--submit-block-size);
  }

  submit-notice {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 0.75rem;
    min-inline-size: 0;
    block-size: var(--submit-block-size);
    padding-inline: 0.75rem;
    font-size: 1.25rem;
    color: var(--foreground-l3);
    background: var(--background-l4);
    border-radius: var(--radius-lg);

    span {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    :global(svg) {
      flex-shrink: 0;
      inline-size: 1.5rem;
      block-size: 1.5rem;
    }
  }

  submit-notice[data-tone='success'] {
    color: var(--foreground-success);
    background: var(--background-success);
  }

  /* The flag input fills the row and reads as a terminal field. */
  submit-row :global(input[data-flag-input]) {
    flex: 1;
    min-inline-size: 0;
    block-size: var(--submit-block-size);
    font-family: var(--font-mono);
    font-size: 1.25rem;
    border-radius: var(--radius-lg);

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  button {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    padding-inline: 1rem;
    block-size: var(--submit-block-size);
    color: var(--foreground-l4);
    background: var(--background-l4);
    cursor: pointer;
    border-radius: var(--radius-lg);

    &:hover:enabled {
      background: var(--background-l5);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    :global(svg) {
      inline-size: 1.5rem;
      block-size: 1.5rem;
    }
  }

  /* Stretch the login button to the bar width and height. */
  challenge-submit :global(a[data-variant]) {
    gap: 0.5rem;
    inline-size: 100%;
    block-size: var(--submit-block-size);
    font-size: 1.25rem;
  }
</style>
