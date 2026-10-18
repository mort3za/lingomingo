import { expect, test } from 'bun:test'
import { createQueue, Preempted } from './queue'

/** A task that ends when `end()` is called, and writes its name to `log` when it starts. */
function task(log: string[], name: string) {
  let end!: () => void
  const done = new Promise<string>((r) => (end = () => r(name)))
  return { run: () => (log.push(name), done), end: () => end() }
}

const tick = () => new Promise((r) => setTimeout(r, 0))

test('createQueue runs one task at a time, lower priority first', async () => {
  const run = createQueue()
  const log: string[] = []
  const lines1 = task(log, 'lines1')
  const lines2 = task(log, 'lines2')
  const extras = task(log, 'extras')
  const word = task(log, 'word')
  const all = Promise.all([
    run(2, lines1.run),
    run(2, lines2.run),
    run(1, extras.run),
    run(0, word.run),
  ])
  expect(log).toEqual(['lines1'])
  for (const t of [lines1, word, extras, lines2]) {
    t.end()
    await tick()
  }
  expect(log).toEqual(['lines1', 'word', 'extras', 'lines2'])
  expect(await all).toEqual(['lines1', 'lines2', 'extras', 'word'])
})

test('createQueue: a failed task starts the next one', async () => {
  const run = createQueue()
  const failed = run(0, () => Promise.reject(new Error('down')))
  const next = run(0, () => Promise.resolve('ok'))
  expect(failed).rejects.toThrow('down')
  expect(await next).toBe('ok')
})

test('createQueue: an abort removes a waiting task', async () => {
  const run = createQueue()
  const log: string[] = []
  const first = task(log, 'first')
  const ctrl = new AbortController()
  const p1 = run(0, first.run)
  const p2 = run(0, task(log, 'aborted').run, ctrl.signal)
  const p3 = run(0, () => Promise.resolve('last'))
  ctrl.abort()
  expect(p2).rejects.toThrow()
  first.end()
  expect(await p1).toBe('first')
  expect(await p3).toBe('last')
  expect(log).toEqual(['first'])
})

/** A task that ends when its signal aborts, like a fetch. */
const untilAbort = (log: string[], name: string) => (signal?: AbortSignal) =>
  new Promise<string>((_, reject) => {
    log.push(name)
    signal?.addEventListener('abort', () => reject(new Error('aborted')))
  })

test('createQueue: a lower priority stops a preemptible task and starts at once', async () => {
  const run = createQueue()
  const log: string[] = []
  const word = task(log, 'word')
  const lines = run(2, untilAbort(log, 'lines'), undefined, true)
  const lines2 = run(2, () => (log.push('lines2'), Promise.resolve('lines2')), undefined, true)
  const w = run(0, word.run)
  expect(lines).rejects.toBeInstanceOf(Preempted)
  await tick()
  expect(log).toEqual(['lines', 'word'])
  word.end()
  expect(await w).toBe('word')
  expect(await lines2).toBe('lines2')
})

test('createQueue: a task that is not preemptible does not stop', async () => {
  const run = createQueue()
  const log: string[] = []
  const extras = task(log, 'extras')
  const e = run(1, extras.run)
  const w = run(0, () => (log.push('word'), Promise.resolve('word')), undefined, true)
  await tick()
  expect(log).toEqual(['extras'])
  extras.end()
  expect(await e).toBe('extras')
  expect(await w).toBe('word')
})

test('createQueue: the same priority does not stop a preemptible task', async () => {
  const run = createQueue()
  const log: string[] = []
  const first = task(log, 'first')
  const p1 = run(2, first.run, undefined, true)
  const p2 = run(2, () => (log.push('second'), Promise.resolve('second')))
  await tick()
  expect(log).toEqual(['first'])
  first.end()
  expect(await p1).toBe('first')
  expect(await p2).toBe('second')
})
