const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (const b of data) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** A zip file of text files, with no compression: subtitle files are small. */
export function zip(files: { name: string; text: string }[], date = new Date()): Blob {
  const enc = new TextEncoder()
  // MS-DOS time and date, as zip readers expect them.
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const f of files) {
    const name = enc.encode(f.name)
    const data = enc.encode(f.text)
    const crc = crc32(data)
    // The same fields are in the local header (from byte 4) and the central entry (from byte 6).
    const common = (v: DataView, at: number) => {
      v.setUint16(at, 20, true) // version needed: 2.0
      v.setUint16(at + 2, 0x0800, true) // the names are UTF-8
      v.setUint16(at + 4, 0, true) // stored, not compressed
      v.setUint16(at + 6, time, true)
      v.setUint16(at + 8, day, true)
      v.setUint32(at + 10, crc, true)
      v.setUint32(at + 14, data.length, true)
      v.setUint32(at + 18, data.length, true)
      v.setUint16(at + 22, name.length, true)
    }
    const local = new Uint8Array(30 + name.length + data.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    common(lv, 4)
    local.set(name, 30)
    local.set(data, 30 + name.length)

    const central = new Uint8Array(46 + name.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true) // made by version 2.0
    common(cv, 6)
    cv.setUint32(42, offset, true)
    central.set(name, 46)

    locals.push(local)
    centrals.push(central)
    offset += local.length
  }
  const size = centrals.reduce((n, c) => n + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, size, true)
  ev.setUint32(16, offset, true)
  return new Blob([...locals, ...centrals, end] as BlobPart[], { type: 'application/zip' })
}
