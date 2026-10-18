/** Save `data` as a file in the downloads folder. */
export function download(name: string, data: string | Blob, type: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(typeof data === 'string' ? new Blob([data], { type }) : data)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
