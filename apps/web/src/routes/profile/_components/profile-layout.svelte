<script lang="ts">
  import type { Challenge, PublicUserProfile, UserProfile } from '@rctf/types'
  import type { Snippet } from 'svelte'
  import ChallengeProgress from './challenge-progress.svelte'
  import ProfileInfo from './profile-info.svelte'

  interface Props {
    user: UserProfile | PublicUserProfile
    divisionLabel: string
    challenges: Challenge[]
    children?: Snippet
  }

  let { user, divisionLabel, challenges, children }: Props = $props()
</script>

<div class="mx-auto grid h-[calc(100vh-72px)] w-full max-w-5xl grid-cols-2 gap-4">
  <ProfileInfo {user} {divisionLabel}>
    {#if children}
      {@render children()}
    {/if}
  </ProfileInfo>

  <ChallengeProgress {challenges} solves={user.solves} showUnsolved={challenges.length > 0} />
</div>
