const IDS = {
  SEGMENT: 0x18538067,
  INFO: 0x1549A966,
  TIMECODE_SCALE: 0x2AD7B1,
  DURATION: 0x4489,
}

interface ElementInfo {
  id: number
  next: number
  dataStart: number
  dataEnd: number
}

function vintLength(firstByte: number) {
  for(let len = 1; len <= 8; len++){
    if (firstByte & (0x80 >> (len - 1))) return len
  }
  return 0
}

function readElement(view: DataView, offset: number, limit: number): ElementInfo|undefined {
  if (offset >= limit) return undefined
  const idLength = vintLength(view.getUint8(offset))
  if (!idLength || offset + idLength >= limit) return undefined
  let id = 0
  for(let i = 0; i < idLength; i++){
    id = id * 256 + view.getUint8(offset + i)
  }

  const sizeOffset = offset + idLength
  const sizeLength = vintLength(view.getUint8(sizeOffset))
  if (!sizeLength || sizeOffset + sizeLength > limit) return undefined

  let size = view.getUint8(sizeOffset) & (0xFF >> sizeLength)
  let unknownSize = size === (0xFF >> sizeLength)
  for(let i = 1; i < sizeLength; i++){
    const byte = view.getUint8(sizeOffset + i)
    size = size * 256 + byte
    unknownSize = unknownSize && byte === 0xFF
  }

  const dataStart = sizeOffset + sizeLength
  const dataEnd = unknownSize ? limit : Math.min(dataStart + size, limit)
  return {id, next: dataEnd, dataStart, dataEnd}
}

function findChild(view: DataView, start: number, end: number, id: number) {
  let offset = start
  while(offset < end){
    const element = readElement(view, offset, end)
    if (!element || element.next <= offset) return undefined
    if (element.id === id) return element
    offset = element.next
  }
  return undefined
}

function readUnsignedInteger(view: DataView, start: number, end: number) {
  let value = 0
  for(let offset = start; offset < end; offset++){
    value = value * 256 + view.getUint8(offset)
  }
  return value
}

export async function fixWebmDuration(blob: Blob, durationMs: number) {
  if (!Number.isFinite(durationMs) || durationMs <= 0 || !blob.type.includes('webm')) return blob

  const buffer = await blob.arrayBuffer()
  const view = new DataView(buffer)
  const segment = findChild(view, 0, buffer.byteLength, IDS.SEGMENT)
  const info = segment ? findChild(view, segment.dataStart, segment.dataEnd, IDS.INFO) : undefined
  const duration = info ? findChild(view, info.dataStart, info.dataEnd, IDS.DURATION) : undefined
  if (!info || !duration) {
    return blob
  }

  const durationByteLength = duration.dataEnd - duration.dataStart
  if (durationByteLength !== 4 && durationByteLength !== 8) {
    return blob
  }

  const timecodeScaleElement = findChild(view, info.dataStart, info.dataEnd, IDS.TIMECODE_SCALE)
  const timecodeScale = timecodeScaleElement ?
    readUnsignedInteger(view, timecodeScaleElement.dataStart, timecodeScaleElement.dataEnd) : 1000000
  const durationValue = durationMs * 1000000 / timecodeScale

  if (durationByteLength === 4) {
    view.setFloat32(duration.dataStart, durationValue, false)
  }else{
    view.setFloat64(duration.dataStart, durationValue, false)
  }

  return new Blob([buffer], {type: blob.type})
}
