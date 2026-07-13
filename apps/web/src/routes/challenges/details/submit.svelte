<script lang="ts">
  import {
    BadAlreadySolvedChallenge,
    GoodFlag,
    SubmitFlagRoute,
    type Challenge,
  } from '@rctf/types'
  import { showApiError } from '$lib/api'
  import { useApiForm } from '$lib/forms/use-api-form.svelte'
  import {
    IconCheck,
    IconInfo,
    IconPaperPlaneTilt,
    IconSignIn,
  } from '$lib/icons'
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
  const flagPlaceholder = $derived(
    clientConfig?.flagFormatPlaceholder ?? 'flag{...}'
  )

  const endTime = $derived(clientConfig?.endTime ?? Number.POSITIVE_INFINITY)

  const userQuery = useCurrentUser()
  const isAuthenticated = $derived(userQuery.data != null)

  let now = $state(Date.now())

  const submitState = $derived(
    resolveSubmitState({ isArchived, endTime, now, isAuthenticated, isSolved })
  )

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
      <IconInfo />
      <span>The CTF is archived.</span>
    </submit-notice>
  {:else if submitState === 'ended'}
    <submit-notice>
      <IconInfo />
      <span>The CTF has ended.</span>
    </submit-notice>
  {:else if submitState === 'login'}
    <Button href="/login">
      <IconSignIn />
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
            <IconPaperPlaneTilt />
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

    :global(a[data-variant]) {
      gap: 0.5rem;
      inline-size: 100%;
      block-size: var(--submit-block-size);
      font-size: 1.25rem;
    }
  }

  form {
    display: block;
  }

  submit-row {
    display: flex;
    align-items: stretch;
    gap: 0.5rem;
    block-size: var(--submit-block-size);

    :global(input[data-flag-input]) {
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

    &[data-tone='success'] {
      color: var(--foreground-success);
      background: var(--background-success);
    }

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
</style>
