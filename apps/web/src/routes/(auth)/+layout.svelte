<script lang="ts">
  import type { LayoutProps } from './$types'

  const { children }: LayoutProps = $props()
</script>

<auth-layout>
  <auth-container>
    {@render children()}
  </auth-container>
</auth-layout>

<style>
  auth-layout {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: var(--space-s);
  }

  auth-container {
    display: block;
    inline-size: 100%;
    max-inline-size: 28rem;

    :global {
      auth-page {
        display: flex;
        flex-direction: column;
        gap: var(--space-s);

        > p {
          font-size: var(--step--1);
          color: var(--foreground-l3);

          strong {
            color: var(--foreground-l1);
            font-weight: var(--font-weight-medium);
          }

          button {
            --underline: currentColor;

            display: inline;
            color: var(--foreground-prose-link);
            text-decoration: underline;
            text-decoration-color: var(--underline);
            cursor: pointer;
          }

          &[role='alert'] {
            padding: var(--space-2xs);
            color: var(--foreground-destructive);
            background: var(--background-destructive);
            border-radius: var(--radius-md);
          }
        }

        > button {
          inline-size: 100%;
        }

        form {
          display: flex;
          flex-direction: column;
          gap: var(--space-s);

          p {
            font-size: var(--step--1);

            a {
              --underline: currentColor;

              color: var(--foreground-prose-link);
            }
          }

          button[type='submit'] {
            inline-size: 100%;
          }
        }
      }

      auth-divider {
        display: flex;
        align-items: center;
        gap: var(--space-2xs);
        font-size: var(--step--1);
        color: var(--foreground-l3);

        &::before,
        &::after {
          flex: 1;
          content: '';
          border-block-start: 2px solid var(--border);
        }
      }

      footer-note {
        display: block;
        font-size: var(--step--1);
        color: var(--foreground-l3);
        text-align: center;

        a,
        button {
          --underline: currentColor;

          color: var(--foreground-prose-link);
          cursor: pointer;
        }

        button {
          display: inline;
          text-decoration: underline;
          text-decoration-color: var(--underline);
        }
      }
    }
  }
</style>
