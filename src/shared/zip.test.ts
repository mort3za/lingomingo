import { expect, test } from 'bun:test'
import { crc32, zip } from './zip'

test('crc32 gives the standard check value', () => {
  expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
})

test('zip makes a file that unzip reads back', async () => {
  const blob = zip([
    { name: 'a.en.srt', text: 'Hello' },
    { name: 'a.fa.srt', text: 'سلام' },
  ])
  const path = `${process.env.TMPDIR ?? '/tmp'}/zip-test-${Date.now()}.zip`
  await Bun.write(path, blob)
  expect((await Bun.$`unzip -tq ${path}`.text()).trim()).toBe(
    `No errors detected in compressed data of ${path}.`,
  )
  expect(await Bun.$`unzip -p ${path} a.fa.srt`.text()).toBe('سلام')
  await Bun.$`rm ${path}`
})
