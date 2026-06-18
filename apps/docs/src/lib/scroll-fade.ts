import { defineHastPlugin } from 'satteri'

export const scrollFade = defineHastPlugin({
  name: 'scroll-fade',
  element: {
    filter: ['pre'],
    visit(pre, ctx) {
      if (pre.properties?.dataLanguage === undefined) return
      ctx.setProperty(pre, 'dataScrollFade', '')
    },
  },
})
