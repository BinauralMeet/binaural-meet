const SEEK_TOLERANCE = 0.08

export function seekMediaElement(media: HTMLMediaElement, currentTime: number, timeout = 3000) {
  return new Promise<void>((resolve) => {
    const targetTime = Math.max(0, currentTime)
    let finishTimer = 0
    let retryTimer = 0
    let durationPrepared = false
    let finished = false
    let attempts = 0
    let seekTo = targetTime

    const isNearTarget = () => Math.abs(media.currentTime - seekTo) < SEEK_TOLERANCE

    const cleanup = () => {
      media.removeEventListener('seeked', check)
      media.removeEventListener('error', finish)
      media.removeEventListener('loadeddata', check)
      media.removeEventListener('canplay', check)
      media.removeEventListener('timeupdate', check)
      if (finishTimer) window.clearTimeout(finishTimer)
      if (retryTimer) window.clearTimeout(retryTimer)
    }

    const finish = () => {
      if (finished) return
      finished = true
      cleanup()
      resolve()
    }

    const scheduleRetry = () => {
      if (finished || retryTimer) return
      retryTimer = window.setTimeout(() => {
        retryTimer = 0
        seek()
      }, 80)
    }

    const check = () => {
      if (isNearTarget()) {
        finish()
      }else if (media.readyState >= 2 && attempts < 8){
        scheduleRetry()
      }
    }

    const seek = () => {
      if (finished) return
      seekTo = targetTime
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
          media.currentTime = Number.MAX_SAFE_INTEGER
        }catch(e) {
          prepareSeek()
        }
        return
      }

      try {
        if (Math.abs(media.currentTime - seekTo) < 0.05) {
          finish()
          return
        }
        attempts += 1
        media.addEventListener('seeked', check, {once: true})
        media.addEventListener('error', finish, {once: true})
        media.addEventListener('loadeddata', check)
        media.addEventListener('canplay', check)
        media.addEventListener('timeupdate', check)
        if (!finishTimer) finishTimer = window.setTimeout(finish, timeout)
        media.currentTime = seekTo
        if (!media.seeking) {
          check()
        }
      }catch(e) {
        console.warn(`Failed to seek media element to ${targetTime}.`, e)
        finish()
      }
    }

    if (media.readyState >= 1) {
      seek()
    }else {
      media.addEventListener('loadedmetadata', seek, {once: true})
      media.load()
    }
  })
}
