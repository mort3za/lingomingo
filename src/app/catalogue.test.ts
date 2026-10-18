import { expect, test } from 'bun:test'
import { channelUrl } from './catalogue'

test('channelUrl: channel ID, @handle and channel links', () => {
  const id = 'UCbxb2fqe9oNgglAoYqsYOtQ'
  expect(channelUrl(id)).toBe(`https://www.youtube.com/channel/${id}`)
  expect(channelUrl(' @EasyGerman ')).toBe('https://www.youtube.com/@EasyGerman')
  expect(channelUrl('EasyGerman')).toBe('https://www.youtube.com/@EasyGerman')
  expect(channelUrl('@Glücksritter')).toBe('https://www.youtube.com/@Gl%C3%BCcksritter')
  expect(channelUrl('https://www.youtube.com/@EasyGerman/videos?view=0')).toBe(
    'https://www.youtube.com/@EasyGerman',
  )
  expect(channelUrl('youtube.com/@EasyGerman')).toBe('https://www.youtube.com/@EasyGerman')
  expect(channelUrl(`https://m.youtube.com/channel/${id}/featured`)).toBe(
    `https://www.youtube.com/channel/${id}`,
  )
  expect(channelUrl('https://www.youtube.com/c/EasyGerman')).toBe(
    'https://www.youtube.com/c/EasyGerman',
  )
  expect(channelUrl('https://www.youtube.com/user/EasyGerman')).toBe(
    'https://www.youtube.com/user/EasyGerman',
  )
})

test('channelUrl: not a channel', () => {
  expect(channelUrl('')).toBeNull()
  expect(channelUrl('easy german')).toBeNull()
  expect(channelUrl('https://www.youtube.com/watch?v=abc')).toBeNull()
  expect(channelUrl('https://example.com/@EasyGerman')).toBeNull()
  expect(channelUrl('https://notyoutube.com/@EasyGerman')).toBeNull()
})
