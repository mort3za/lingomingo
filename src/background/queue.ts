/**
 * Runs one task at a time. Waiting tasks start by priority (lower first), then in order.
 * An abort of `signal` removes a task that did not start yet.
 */
export function createQueue() {
  const waiting: { priority: number; start: () => void }[] = []
  let busy = false
  const next = () => {
    busy = false
    const job = waiting.shift()
    if (job) {
      busy = true
      job.start()
    }
  }
  return function run<T>(
    priority: number,
    task: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () => void task().then(resolve, reject).finally(next)
      if (!busy) {
        busy = true
        return start()
      }
      const job = { priority, start }
      const i = waiting.findIndex((j) => j.priority > priority)
      waiting.splice(i === -1 ? waiting.length : i, 0, job)
      signal?.addEventListener(
        'abort',
        () => {
          const k = waiting.indexOf(job)
          if (k === -1) return
          waiting.splice(k, 1)
          reject(signal.reason)
        },
        { once: true },
      )
    })
  }
}
