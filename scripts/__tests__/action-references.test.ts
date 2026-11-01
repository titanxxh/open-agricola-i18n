import { describe, expect, it } from 'vitest'
import { preserveActionReferences } from '../i18n/action-references'
import { readFileSync } from 'node:fs'

describe('BGA action reference preservation', () => {
  it('keeps reviewed space targets distinct from ordinary actions in the published languages', () => {
    const manifest = JSON.parse(readFileSync('packs/manifest.json', 'utf8'))
    const packs: Record<string, Record<string, string>> = Object.fromEntries(manifest.languages.map((language: { id: string; file: string }) =>
      [language.id, JSON.parse(readFileSync(`packs/${language.file}`, 'utf8')).messages]))
    const targets = (text: string) => [...text.matchAll(/__(space|moor):([^|_]+)\|/g)]
      .flatMap(match => match[2].split(',').map(id => `${match[1]}:${id}`)).sort()
    expect(targets(packs.en['cardFaces.B059_FoodChest.description'])).toEqual(['space:major-improvement'])
    expect(targets(packs.en['cardFaces.A010_WoodenShed.description'])).toEqual([])
    expect(targets(packs.en['cardFaces.D127_HardworkingMan.description'])).toEqual([])
    expect(targets(packs.zh['cardFaces.M083_CoalSeam.description'])).toEqual(['moor:hiring-fair', 'space:day-laborer'])
    for (const [key, text] of Object.entries(packs.en)) {
      if (!key.startsWith('cardFaces.')) continue
      for (const [locale, messages] of Object.entries(packs)) {
        expect(targets(messages[key] ?? ''), `${locale}:${key}`).toEqual(targets(text))
      }
    }
  })
  it('preserves target identity and leaves ordinary actions as emphasis', () => {
    expect(preserveActionReferences('使用 __space:major-improvement|主要改良__ 行动格，执行 __播种__。',
      '使用__主要改良__行动格，然后执行__播种__。'))
      .toBe('使用__space:major-improvement|主要改良__行动格，然后执行__播种__。')
  })
  it('requires review instead of silently losing a target when its label changes', () => {
    expect(preserveActionReferences('__moor:cut-peat|挖泥炭__', '__泥炭开采__')).toBeUndefined()
  })
})
