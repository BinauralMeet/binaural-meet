import { playbackAudioDebug } from './playbackAudioDebug'

export function seekMediaElement(media: HTMLMediaElement, currentTime: number, timeout = 1000) {
  return new Promise<void>((resolve) => {
    const targetTime = Math.max(0, currentTime)
    let fallback = 0
    let durationPrepared = false

    const finish = () => {
      playbackAudioDebug('seekMediaElement finish', {
        targetTime,
        currentTime: media.currentTime,
        duration: Number.isFinite(media.duration) ? media.duration : String(media.duration),
        hasSrc: !!media.src,
        srcPrefix: media.src ? media.src.slice(0, 24) : '',
        hasSrcObject: !!media.srcObject,
        readyState: media.readyState,
        networkState: media.networkState,
      })
      media.removeEventListener('seeked', finish)
      media.removeEventListener('error', finish)
      if (fallback) window.clearTimeout(fallback)
      resolve()
    }

    const seek = () => {
      playbackAudioDebug('seekMediaElement seek', {
        targetTime,
        currentTime: media.currentTime,
        duration: Number.isFinite(media.duration) ? media.duration : String(media.duration),
        hasSrc: !!media.src,
        srcPrefix: media.src ? media.src.slice(0, 24) : '',
        hasSrcObject: !!media.srcObject,
        readyState: media.readyState,
        networkState: media.networkState,
      })
      if (!durationPrepared && media.duration === Infinity && targetTime > 0) {
        durationPrepared = true
        let prepared = false
        let prepareTimer = 0
        const prepareSeek = () => {
          if (prepared) { return }
          prepared = true
          media.removeEventListener('durationchange', prepareSeek)
          media.removeEventListener('timeupdate', prepareSeek)
          if (prepareTimer) window.clearTimeout(prepareTimer)
          seek()
        }
        media.addEventListener('durationchange', prepareSeek, {once: true})
        media.addEventListener('timeupdate', prepareSeek, {once: true})
        prepareTimer = window.setTimeout(prepareSeek, 500)
        try {
          playbackAudioDebug('seekMediaElement prepare infinite duration', {targetTime})
          media.currentTime = Number.MAX_SAFE_INTEGER
        }catch(e) {
          prepareSeek()
        }
        return
      }

      try {
        const duration = Number.isFinite(media.duration) ? media.duration : undefined
        const seekTo = duration === undefined ? targetTime : Math.min(targetTime, Math.max(0, duration - 0.01))
        if (Math.abs(media.currentTime - seekTo) < 0.05) {
          playbackAudioDebug('seekMediaElement already near target', {
            targetTime,
            seekTo,
            currentTime: media.currentTime,
          })
          resolve()
          return
        }
        media.addEventListener('seeked', finish, {once: true})
        media.addEventListener('error', finish, {once: true})
        fallback = window.setTimeout(finish, timeout)
        media.currentTime = seekTo
      }catch(e) {
        console.warn(`Failed to seek media element to ${targetTime}.`, e)
        finish()
      }
    }

    if (media.readyState >= 1) {
      seek()
    }else {
      playbackAudioDebug('seekMediaElement waiting loadedmetadata', {
        targetTime,
        hasSrc: !!media.src,
        srcPrefix: media.src ? media.src.slice(0, 24) : '',
        hasSrcObject: !!media.srcObject,
        readyState: media.readyState,
        networkState: media.networkState,
      })
      media.addEventListener('loadedmetadata', seek, {once: true})
      media.load()
    }
  })
}
