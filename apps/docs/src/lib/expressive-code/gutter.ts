import { definePlugin, type ExpressiveCodePlugin } from 'satteri-expressive-code'

export function pluginCompactGutter(): ExpressiveCodePlugin {
  return definePlugin({
    name: 'Compact Gutter',
    baseStyles: ({ cssVar }) => `
      .gutter .ln {
        padding-inline: ${cssVar('codePaddingInline')} 0;
      }
    `,
  })
}
