import { defineConfig } from 'vocs'

export default defineConfig({
  aiCta: false,
  checkDeadlinks: 'warn',
  description:
    "rCTF is redpwn's CTF platform. It is now developed and maintained by the OtterSec team.",
  editLink: {
    pattern: 'https://github.com/otter-sec/rctf/edit/main/apps/docs/docs/:path',
    text: 'Edit on GitHub',
  },
  font: {
    default: {
      google: 'Lexend',
    },
    mono: {
      google: 'JetBrains Mono',
    },
  },
  iconUrl: '/favicon.svg',
  logoUrl: {
    light: '/wordmark-light.svg',
    dark: '/wordmark-dark.svg',
  },
  title: 'rCTF Docs',
  sidebar: [
    {
      text: 'rCTF',
      items: [
        {
          text: 'Installation',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/installation' },
            { text: 'Manual', link: '/installation/manual' },
            { text: 'Upgrading from v1', link: '/installation/upgrading' },
          ],
        },
        {
          text: 'Configuration',
          link: '/configuration',
        },
        {
          text: 'Providers',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/providers' },
            { text: 'Captcha', link: '/providers/captcha' },
            { text: 'Email', link: '/providers/emails' },
            { text: 'Uploads', link: '/providers/uploads' },
            { text: 'Scoring', link: '/providers/scores' },
            { text: 'Moderation', link: '/providers/moderation' },
          ],
        },
        {
          text: 'Integrations',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/integrations' },
            { text: 'CTFtime', link: '/integrations/ctftime' },
            { text: 'Instancer', link: '/integrations/instancer' },
            { text: 'Blood Bot', link: '/integrations/bloodbot' },
          ],
        },
        {
          text: 'Admin Panel',
          link: '/admin',
        },
        {
          text: 'API Reference',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/api' },
            { text: 'Challenges', link: '/api/challenges' },
            { text: 'Leaderboard', link: '/api/leaderboard' },
            { text: 'Users', link: '/api/users' },
            { text: 'Admin', link: '/api/admin' },
          ],
        },
        {
          text: 'Development',
          link: '/development',
        },
      ],
    },
    {
      text: 'Running a Successful CTF',
      collapsed: false,
      items: [
        {
          text: 'Preparations',
          link: '/running-a-successful-ctf/preparations',
        },
        {
          text: 'Setting Up a CTF Platform',
          link: '/running-a-successful-ctf/setup',
        },
        {
          text: 'Deploying Challenges',
          link: '/running-a-successful-ctf/deployment',
        },
        {
          text: 'During the CTF',
          link: '/running-a-successful-ctf/during-ctf',
        },
        { text: 'After the CTF', link: '/running-a-successful-ctf/after-ctf' },
      ],
    },
  ],
  socials: [
    {
      icon: 'github',
      link: 'https://github.com/otter-sec',
    },
    {
      icon: 'x',
      link: 'https://twitter.com/osec_io',
    },
  ],
  theme: {
    accentColor: '#ff6467',
    variables: {
      fontWeight: {
        regular: '400',
        medium: '400',
        semibold: '400',
      },
      fontSize: {
        h1: '28px',
        h2: '24px',
        h3: '22px',
        h4: '20px',
        h5: '18px',
        h6: '16px',
      }
    },
  },
  topNav: [
    { text: 'Blog', link: '/blog', match: '/blog' },
    {
      text: 'v1.1.0',
      items: [
        {
          text: 'Changelog',
          link: 'https://github.com/otter-sec/rctf/releases/tag/v1.1.0',
        },
        {
          text: 'Contributing',
          link: 'https://github.com/otter-sec/rctf/blob/main/README.md#contributing',
        },
      ],
    },
  ],
})
