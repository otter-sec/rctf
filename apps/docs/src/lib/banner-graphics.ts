export type BannerGraphic = {
  id: string
  src: string
  title: string
  description: string
  artist: string
  year: string
  objectPosition: `${number}% ${number}%`
}

export const BANNER_GRAPHICS = [
  {
    id: 'rctf',
    src: '/static/1200x630.png',
    title: 'rCTF',
    description: 'rCTF documentation banner.',
    artist: 'OtterSec',
    year: '2026',
    objectPosition: '50% 50%',
  },
] satisfies [BannerGraphic, ...BannerGraphic[]]

export const DEFAULT_BANNER_GRAPHIC = BANNER_GRAPHICS[0]
export const DEFAULT_ROTATING_BANNER_GRAPHIC_ID = 'rctf'

export function getBannerGraphic(src: string): BannerGraphic {
  return (
    BANNER_GRAPHICS.find((graphic) => graphic.src === src) ?? {
      id: src,
      src,
      title: 'Banner',
      description: 'Documentation banner.',
      artist: '',
      year: '',
      objectPosition: '50% 50%',
    }
  )
}
