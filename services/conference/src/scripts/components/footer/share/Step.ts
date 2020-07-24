export type Step = 'entrance' | 'none' | 'text' | 'iframe' | 'image'

export const stepTitle: {
  [key: string]: string,
} = {
  entrance: 'Share',
  text: 'Share text',
  iframe: 'Share iframe',
  image: 'Share image',
  none: 'None',
}
