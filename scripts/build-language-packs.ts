import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCardsManifest, type CardsManifest } from './game-metadata'
import { flattenDictionary } from './i18n/flatten-dictionary'
type LanguagePack = { version: 1; locale: string; messages: Record<string,string> }
type PackFile = { file: string; sha256: string }
type LanguageManifest = { version: 2; defaultLocale: string; languages: Array<{ id: string; name: string; core: PackFile; cards: PackFile; sourceSha256: string }> }

/** Card text is only needed where cards are shown, so it ships as a second file that startup does not wait for. */
const CARD_TEXT_GROUPS = new Set(['cardFaces', 'occupations', 'minorImprovements', 'improvements', 'cards', 'parentFaces'])
/** Long card text lives under `cardFaces`; the typed groups keep only the names that rules output refers to. */
const DUPLICATED_CARD_TEXT = /^(occupations|minorImprovements|improvements)\.[^.]+\.(description|rules|prerequisite)$/

export function splitLanguagePack(pack: LanguagePack): { core: LanguagePack; cards: LanguagePack } {
  const core: Record<string, string> = {}
  const cards: Record<string, string> = {}
  for (const [key, text] of Object.entries(pack.messages)) {
    if (DUPLICATED_CARD_TEXT.test(key)) continue
    if (CARD_TEXT_GROUPS.has(key.slice(0, key.indexOf('.')))) cards[key] = text
    else core[key] = text
  }
  return { core: { version: 1, locale: pack.locale, messages: core }, cards: { version: 1, locale: pack.locale, messages: cards } }
}

export function compileLanguagePack(locale: string, source: unknown, english: unknown, cards: CardsManifest): LanguagePack {
  const own = flattenDictionary(source)
  const base = flattenDictionary(english)
  const messages = Object.fromEntries([...base, ...own].filter(([key]) => !key.startsWith('$')))
  for (const [id, { meta }] of Object.entries(cards)) {
    const prefix = meta.type === 'occupation' || meta.playerActionCardType === 'occupation' ? 'occupations'
      : meta.type === 'major' ? 'improvements' : 'minorImprovements'
    const authored = meta.locales?.[locale]
    const lines = (value: readonly string[] | undefined) => value?.join('\n').trim() ? value.join('\n') : undefined
    const fields = {
      name: authored?.name?.trim() || base.get(`${prefix}.${id}.name`) || meta.name,
      description: lines(authored?.desc) || base.get(`${prefix}.${id}.description`) || meta.desc?.join('\n') || '',
      rules: lines(authored?.rules) || base.get(`${prefix}.${id}.rules`) || meta.rules?.join('\n') || '',
      prerequisite: authored?.prerequisite?.trim() || base.get(`${prefix}.${id}.prerequisite`)
        || (typeof meta.prerequisite === 'string' ? meta.prerequisite : ''),
    }
    for (const [field, fallback] of Object.entries(fields)) {
      const key = `${prefix}.${id}.${field}`
      const text = own.get(key) ?? (field === 'name' ? authored?.name?.trim() || own.get(`cards.${id}.name`) : undefined) ?? fallback
      messages[`cardFaces.${id}.${field}`] = text
      messages[key] = text
      if (field === 'name') messages[`cards.${id}.name`] = text
    }
  }
  for (const [key, text] of Object.entries(messages)) {
    const match = /^(occupations|minorImprovements|improvements)\.([^.]+)\.(name|description|rules|prerequisite)$/.exec(key)
    if (match) messages[`cardFaces.${match[2]}.${match[3]}`] ??= text
  }
  return { version: 1, locale, messages: Object.fromEntries(Object.entries(messages).sort(([a], [b]) => a.localeCompare(b))) }
}

export function buildLanguagePacks(root = resolve('.')): LanguageManifest {
  const input = resolve(root, 'locales')
  const output = resolve(root, 'packs')
  const english: unknown = JSON.parse(readFileSync(resolve(input, 'en.json'), 'utf8'))
  const cards = buildCardsManifest()
  mkdirSync(output, { recursive: true })
  const languages = readdirSync(input).filter(file => /^[a-z]{2,3}(?:-[a-z0-9]+)*\.json$/.test(file)).sort().map(file => {
    const locale = file.slice(0, -5)
    const source: unknown = JSON.parse(readFileSync(resolve(input, file), 'utf8'))
    if (!source || typeof source !== 'object' || !('$name' in source) || typeof source.$name !== 'string') {
      throw new Error(`Language ${locale} needs a $name`)
    }
    const parts = splitLanguagePack(compileLanguagePack(locale, source, english, cards))
    const write = (pack: LanguagePack, stem: string): PackFile => {
      const text = JSON.stringify(pack) + '\n'
      const sha256 = createHash('sha256').update(text).digest('hex')
      const name = `${stem}.${sha256.slice(0, 16)}.json`
      writeFileSync(resolve(output, name), text)
      return { file: name, sha256 }
    }
    return {
      id: locale, name: source.$name, core: write(parts.core, locale), cards: write(parts.cards, `${locale}-cards`),
      sourceSha256: createHash('sha256').update(readFileSync(resolve(input, file))).digest('hex'),
    }
  })
  const manifest: LanguageManifest = { version: 2, defaultLocale: 'zh', languages }
  writeFileSync(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`[build-language-packs] wrote ${languages.length} languages as core and card text packs`)
  return manifest
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildLanguagePacks()
