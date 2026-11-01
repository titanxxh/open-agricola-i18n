/** Keep reviewed target identities when refreshing the surrounding BGA translation. */
export function preserveActionReferences(previous: string, translated: string): string | undefined {
  const targets = new Map<string, string[]>()
  for (const match of previous.matchAll(/__((?:space|moor):[^|_]+)\|([^_]+)__/g)) {
    const queue = targets.get(match[2]) ?? []
    queue.push(match[1]); targets.set(match[2], queue)
  }
  const result = translated.replace(/__([^_]+)__/g, (original, label: string) => {
    const target = targets.get(label)?.shift()
    return target ? `__${target}|${label}__` : original
  })
  return [...targets.values()].some(queue => queue.length) ? undefined : result
}
