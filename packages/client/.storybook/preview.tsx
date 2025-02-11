import { withKnobs } from '@storybook/addon-knobs'

export const decorators =
  (process.env as Record<string, string>).NODE_ENV !== 'test' ? [withKnobs] : []

export const parameters = {
  layout: 'centered',
}
