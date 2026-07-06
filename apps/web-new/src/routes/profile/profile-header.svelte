<script lang="ts">
  import type { PublicUserProfile, UserProfile } from '@rctf/types'
  import { ALL_REGIONS } from '@rctf/util'
  import Avatar from '$lib/ui/avatar.svelte'
  import { countryCodeToFlagFilename } from '$lib/utils/flags'

  type Props = {
    user: UserProfile | PublicUserProfile
    divisions: Record<string, string>
  }

  let { user, divisions }: Props = $props()

  const divisionLabel = $derived(divisions[user.division] ?? user.division)
  const flagFilename = $derived(
    user.countryCode ? countryCodeToFlagFilename(user.countryCode) : null
  )
  const countryName = $derived(
    user.countryCode ? (ALL_REGIONS.find(r => r.code === user.countryCode)?.name ?? null) : null
  )
</script>

<profile-header>
  <header-layout>
    <profile-identity>
      <profile-avatar>
        {#key user.avatarUrl}
          <Avatar src={user.avatarUrl} name={user.name} />
        {/key}
      </profile-avatar>

      <profile-body>
        <profile-name>{user.name}</profile-name>

        <dl>
          <dt>Division</dt>
          <dd>{divisionLabel}</dd>

          <dt>Country</dt>
          {#if flagFilename && countryName}
            <dd data-value="country">
              <img src="/flags/{flagFilename}" alt="{user.countryCode} flag" />
              <span>{countryName}</span>
            </dd>
          {:else}
            <dd data-value="unspecified">(unspecified)</dd>
          {/if}

          <dt>Status</dt>
          {#if user.statusText}
            <dd>{user.statusText}</dd>
          {:else}
            <dd data-value="unspecified">(unspecified)</dd>
          {/if}

          {#if user.ctftimeId}
            <dt>CTFtime</dt>
            <dd>
              <a
                href="https://ctftime.org/team/{user.ctftimeId}"
                target="_blank"
                rel="noopener noreferrer"
              >
                Team #{user.ctftimeId}
              </a>
            </dd>
          {/if}
        </dl>
      </profile-body>
    </profile-identity>

    {#if user.globalPlace !== null || user.divisionPlace !== null}
      <profile-ranks>
        {#if user.globalPlace !== null}
          <profile-rank>
            <rank-place>#{user.globalPlace}</rank-place>
            <rank-label>global</rank-label>
          </profile-rank>
        {/if}
        {#if user.divisionPlace !== null}
          <profile-rank>
            <rank-place>#{user.divisionPlace}</rank-place>
            <rank-label>division</rank-label>
          </profile-rank>
        {/if}
      </profile-ranks>
    {/if}
  </header-layout>
</profile-header>

<style>
  profile-header {
    container-type: inline-size;
    display: block;
  }

  header-layout {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
  }

  profile-identity {
    display: flex;
    min-inline-size: 0;
    gap: var(--space-xs);
  }

  profile-avatar {
    display: contents;

    --avatar-size: 4rem;
  }

  profile-body {
    display: flex;
    min-inline-size: 0;
    flex-direction: column;
    gap: 0.375rem;
  }

  profile-name {
    overflow: hidden;
    color: var(--foreground-l0);
    font-size: var(--step-1);
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.125rem var(--space-s);
    margin: 0;
    font-size: var(--step--1);

    dt {
      color: var(--foreground-l4);
    }

    dd {
      min-inline-size: 0;
      margin: 0;
      overflow: hidden;
      color: var(--foreground-l2);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    dd[data-value='unspecified'] {
      color: var(--foreground-l5);
    }

    dd[data-value='country'] {
      display: flex;
      align-items: center;
      gap: var(--space-3xs);

      img {
        block-size: 1rem;
        inline-size: auto;
        flex-shrink: 0;
      }
    }

    a {
      color: var(--foreground-prose-link);

      &:hover {
        text-decoration: underline;
      }
    }
  }

  profile-ranks {
    display: flex;
    flex-shrink: 0;
    justify-content: space-between;
    font-size: var(--step--1);
    font-variant-numeric: tabular-nums;
  }

  profile-rank {
    display: flex;
    gap: var(--space-3xs);
  }

  rank-place {
    color: var(--foreground-l2);
  }

  rank-label {
    color: var(--foreground-l4);
  }

  @container (min-inline-size: 30rem) {
    header-layout {
      flex-direction: row;
      align-items: flex-start;
      justify-content: space-between;
    }

    profile-ranks {
      flex-direction: column;
      align-items: flex-end;
      gap: 0.125rem;
    }
  }
</style>
