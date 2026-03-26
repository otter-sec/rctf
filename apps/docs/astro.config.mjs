import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import react from '@astrojs/react'

export default defineConfig({
  integrations: [
    react(),
    starlight({
      title: 'rCTF Docs',
      description:
        "rCTF is redpwn's CTF platform. It is now developed and maintained by the OtterSec team.",
      logo: {
        light: './src/assets/wordmark-light.svg',
        dark: './src/assets/wordmark-dark.svg',
        replacesTitle: true,
        alt: 'rCTF',
      },
      favicon: '/favicon.svg',
      editLink: {
        baseUrl:
          'https://github.com/otter-sec/rctf/edit/main/apps/docs/',
      },
      social: {
        github: 'https://github.com/otter-sec',
        'x.com': 'https://twitter.com/osec_io',
      },
      customCss: ['./src/styles/custom.css'],
      expressiveCode: {
        themes: ['vitesse-light', 'vitesse-dark'],
        styleOverrides: {
          codeBackground: ({ theme }) =>
            theme.type === 'dark' ? '#1e1e1e' : '#f0f0f0',
          frames: {
            editorBackground: ({ theme }) =>
              theme.type === 'dark' ? '#1e1e1e' : '#f0f0f0',
            terminalBackground: ({ theme }) =>
              theme.type === 'dark' ? '#1e1e1e' : '#f0f0f0',
            terminalTitlebarBackground: ({ theme }) =>
              theme.type === 'dark' ? '#1e1e1e' : '#f0f0f0',
            editorTabBarBackground: ({ theme }) =>
              theme.type === 'dark' ? '#1e1e1e' : '#f0f0f0',
            editorActiveTabBackground: ({ theme }) =>
              theme.type === 'dark' ? '#1e1e1e' : '#f0f0f0',
          },
        },
      },
      sidebar: [
        {
          label: 'rCTF',
          items: [
            {
              label: 'Installation',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'installation' },
                { label: 'Manual', slug: 'installation/manual' },
                {
                  label: 'Upgrading from v1',
                  slug: 'installation/upgrading',
                },
              ],
            },
            { label: 'Configuration', slug: 'configuration' },
            {
              label: 'Providers',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'providers' },
                { label: 'Captcha', slug: 'providers/captcha' },
                { label: 'Email', slug: 'providers/emails' },
                { label: 'Uploads', slug: 'providers/uploads' },
                { label: 'Scoring', slug: 'providers/scores' },
                { label: 'Moderation', slug: 'providers/moderation' },
              ],
            },
            {
              label: 'Integrations',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'integrations' },
                { label: 'CTFtime', slug: 'integrations/ctftime' },
                { label: 'Instancer', slug: 'integrations/instancer' },
                { label: 'Blood Bot', slug: 'integrations/bloodbot' },
              ],
            },
            {
              label: 'Administration',
              items: [
                { label: 'Overview', slug: 'admin' },
                { label: 'Challenges', slug: 'admin/challenges' },
                { label: 'Teams', slug: 'admin/teams' },
                { label: 'Submissions', slug: 'admin/submissions' },
                { label: 'Uploading', slug: 'admin/uploading' },
              ],
            },
            {
              label: 'API Reference',
              collapsed: true,
              items: [
                { label: 'Overview', slug: 'api' },
                { label: 'Challenges', slug: 'api/challenges' },
                { label: 'Leaderboard', slug: 'api/leaderboard' },
                { label: 'Users', slug: 'api/users' },
                { label: 'Admin', slug: 'api/admin' },
              ],
            },
            {
              label: 'Theming and Styling',
              collapsed: true,
              items: [
                { label: 'Color System', slug: 'theming/colors' },
                { label: 'Categories', slug: 'theming/categories' },
                { label: 'Components', slug: 'theming/components' },
              ],
            },
          ],
        },
        {
          label: 'Running a Successful CTF',
          items: [
            {
              label: 'Prerequisites',
              slug: 'running-a-successful-ctf/01-prerequisites',
            },
            {
              label: 'Challenge Design',
              slug: 'running-a-successful-ctf/02-challenge-design',
            },
            {
              label: 'Setting Up a CTF Platform',
              slug: 'running-a-successful-ctf/03-setup',
            },
            {
              label: 'Deploying Challenges',
              slug: 'running-a-successful-ctf/04-deployment',
            },
            {
              label: 'During the CTF',
              slug: 'running-a-successful-ctf/05-during-ctf',
            },
            {
              label: 'After the CTF',
              slug: 'running-a-successful-ctf/06-after-ctf',
            },
          ],
        },
      ],
    }),
  ],
})
