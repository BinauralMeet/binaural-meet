export function shareScreenStream(stream: MediaStream) {
  // TODO add stream to store
  console.debug('start sharing screen')

  // TODO register callback to stop share event
  stream.getVideoTracks()[0].onended = () => {
    console.debug('stop sharing screen')
  }
}
