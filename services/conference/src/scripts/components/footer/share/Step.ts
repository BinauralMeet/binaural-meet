export type Step = 'entrance' | 'none' | 'text' | 'iframe' | 'image' | 'camera'

export const stepTitle: {
  [key: string]: string,
} = {
  entrance: 'Create and Share',
  text: 'Share text',
  iframe: 'Share iframe',
  image: 'Share image',
  none: 'None',
  camera: 'Select video camera to share',
}
