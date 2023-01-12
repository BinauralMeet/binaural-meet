import {GLTF, GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'

export class PromiseGLTFLoader extends GLTFLoader {
  promiseLoad(
    url: string,
    onProgress?: ((event: ProgressEvent<EventTarget>) => void) | undefined,
  ) {
    return new Promise<GLTF>((resolve, reject) => {
      super.load(url, resolve, onProgress, reject)
    })
  }
}
let loader: PromiseGLTFLoader | undefined = undefined
export function GetPromiseGLTFLoader(){
  if (!loader){
    loader = new PromiseGLTFLoader()
  }
  return loader
}
