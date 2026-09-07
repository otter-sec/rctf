import { definePlugin, type ExpressiveCodePlugin } from 'satteri-expressive-code'
import { setInlineStyle } from 'satteri-expressive-code/hast'

export function pluginIndentGuides(): ExpressiveCodePlugin {
  return definePlugin({
    name: 'Indent Guides',
    baseStyles: ({ cssVar }) => `
      .ec-line .code {
        background-image: repeating-linear-gradient(
          to right,
          color-mix(in oklab, var(--border) 60%, transparent) 0 1px,
          transparent 1px var(--ecIdtW)
        );
        background-repeat: no-repeat;
        background-position-x: calc(${cssVar('codePaddingInline')} - var(--ecGtrBrdWd, 0px));
        background-size: max(0px, calc(var(--ecIndent, 0ch) - 1px)) 100%;
      }
    `,
    hooks: {
      postprocessRenderedBlock: ({ codeBlock, renderData }) => {
        const widths = codeBlock
          .getLines()
          .map(line => line.text.length - line.text.trimStart().length)
          .filter(width => width > 0)
        const unit = widths.length ? Math.min(...widths) : 0
        if (unit < 2) return

        setInlineStyle(renderData.blockAst, '--ecIdtW', `${unit}ch`)
      },
    },
  })
}
