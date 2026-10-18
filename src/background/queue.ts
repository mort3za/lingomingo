/** The error of a task that stopped for a more urgent task. */
export class Preempted extends Error {
  constructor() {
    super('Stopped for a more urgent request.')
  }
}

/**
 * Runs one task at a time. Waiting tasks start by priority (lower first), then in order.
 * An abort of `signal` removes a task that did not start yet.
 * A `preemptible` task stops when a task with a lower priority comes: the signal that it gets
 * aborts, its promise rejects with `Preempted`, and the new task starts at once.
 */
export function createQueue() {
  const waiting: { priority: number; start: () => void }[] = []
  let running: { priority: number; stop?: AbortController } | null = null
  const next = () => {
    running = null
    waiting.shift()?.start()
  }
  return function run<T>(
    priority: number,
    task: (signal?: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
    preemptible = false,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        const stop = preemptible ? new AbortController() : undefined
        running = { priority, stop }
        const s = stop && signal ? AbortSignal.any([signal, stop.signal]) : (stop?.signal ?? signal)
        void task(s)
          .then(resolve, (e: unknown) => reject(stop?.signal.aborted ? new Preempted() : e))
          .finally(next)
      }
      if (!running) return start()
      const job = { priority, start }
      const i = waiting.findIndex((j) => j.priority > priority)
      waiting.splice(i === -1 ? waiting.length : i, 0, job)
      if (running.priority > priority) running.stop?.abort()
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
