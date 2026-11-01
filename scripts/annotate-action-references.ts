import { readFileSync, writeFileSync } from 'node:fs'
import { buildCardsManifest } from './game-metadata'

type Rule = { en: string; zh: string[]; ids: string; kind?: 'space' | 'moor'; group?: string }
const rules: Rule[] = [
  { en: 'Fishing', zh: ['捕鱼'], ids: 'fishing' },
  { en: 'Forest', zh: ['森林'], ids: 'forest' },
  { en: 'Clay Pit', zh: ['黏土坑'], ids: 'clay-pit' },
  { en: 'Reed Bank', zh: ['芦苇河岸'], ids: 'reed-bank' },
  { en: 'Day Laborer', zh: ['打零工'], ids: 'day-laborer' },
  { en: 'Meeting Place', zh: ['集会所'], ids: 'meeting-place' },
  { en: 'Farmland', zh: ['农田'], ids: 'farmland' },
  { en: 'Farm Expansion', zh: ['扩建农舍'], ids: 'farm-expansion' },
  { en: 'Grain Seeds', zh: ['谷物种子'], ids: 'grain-seeds' },
  { en: 'Vegetable Seeds', zh: ['蔬菜种子'], ids: 'vegetable-seeds' },
  { en: 'Grain Utilization', zh: ['谷物利用'], ids: 'grain-utilization' },
  { en: 'Cultivation', zh: ['耕作'], ids: 'cultivation' },
  { en: 'Fencing', zh: ['围栏'], ids: 'fencing', group: 'fences' },
  { en: 'Build Fences', zh: ['围栏'], ids: '', group: 'fences' },
  { en: 'Major Improvement', zh: ['主要改良', '改良'], ids: 'major-improvement', group: 'improvement' },
  { en: 'Major or Minor Improvement', zh: ['改良'], ids: '', group: 'improvement' },
  { en: 'Minor/Major Improvement', zh: ['小改良', '主要改良'], ids: '', group: 'improvement' },
  { en: 'Wish for Children', zh: ['渴望孩子', '家庭增长'], ids: 'wish-children,urgent-wish-children,modest-wish-children-56', group: 'growth' },
  { en: 'Family Growth', zh: ['家庭增长'], ids: '', group: 'growth' },
  { en: 'Urgent Wish for Children', zh: ['紧急渴望孩子'], ids: 'urgent-wish-children' },
  { en: 'House Redevelopment', zh: ['住宅改建'], ids: 'house-redevelopment' },
  { en: 'Farm Redevelopment', zh: ['农场改建'], ids: 'farm-redevelopment' },
  { en: 'Sheep Market', zh: ['羊市场'], ids: 'sheep-market' },
  { en: 'Pig Market', zh: ['猪市场'], ids: 'pig-market' },
  { en: 'Cattle Market', zh: ['牛市场'], ids: 'cattle-market' },
  { en: 'Quarry', zh: ['采石场'], ids: 'western-quarry,eastern-quarry' },
  { en: 'Lessons', zh: ['课程'], ids: 'lessons,lessons-3,lessons-4,lessons-56-2f,lessons-56-variable' },
  { en: 'Traveling Players', zh: ['流浪艺人'], ids: 'traveling-players,traveling-players-56' },
  { en: 'Grove', zh: ['树林'], ids: 'grove,grove-56' },
  { en: 'Hollow', zh: ['低洼地'], ids: 'hollow,hollow-4,hollow-56' },
  { en: 'Resource Market', zh: ['资源市场'], ids: 'resource-market,resource-market-4,resource-market-56,moor-resource-market-12' },
  { en: 'Animal Market', zh: ['动物市场'], ids: 'animal-market-56' },
  { en: 'Riverbank Forest', zh: ['河岸森林'], ids: 'riverbank-forest-56' },
  { en: 'House Building', zh: ['建造房屋'], ids: 'house-building-56' },
  { en: 'Farm Supplies', zh: ['农场补给'], ids: 'farm-supplies-6' },
  { en: 'Cut Peat', zh: ['挖泥炭'], ids: 'cut-peat', kind: 'moor' },
  { en: 'Fell Trees', zh: ['伐木'], ids: 'fell-trees', kind: 'moor' },
  { en: 'Slash and Burn', zh: ['刀耕火种'], ids: 'slash-and-burn', kind: 'moor' },
  { en: 'Horse Market', zh: ['马匹市场'], ids: 'horse-market', kind: 'moor' },
  { en: 'Hiring Fair', zh: ['雇工集市'], ids: 'hiring-fair', kind: 'moor' },
  { en: 'Black Market', zh: ['黑市'], ids: 'black-market', kind: 'moor' },
  { en: 'Illicit Work', zh: ['非法劳作'], ids: 'illicit-work', kind: 'moor' },
]
const english = new Map(rules.map(rule => [rule.en, rule]))
const group = (rule: Rule) => rule.group ?? rule.en
const chinese = new Map(rules.flatMap(rule => rule.zh.map(label => [label, group(rule)] as const)))
const strip = (text: string) => text.replace(/__(?:space|moor):[^|_]+\|([^_]+)__/g, '__$1__')
const token = (label: string, rule: Rule | undefined) => rule?.ids
  ? `__${rule.kind ?? 'space'}:${rule.ids}|${label}__` : `__${label}__`

/** One-time migration, safe to rerun. Runtime lookup never guesses from translated names. */
export function annotateActionReferences(root = '.') {
  const manifest = JSON.parse(readFileSync(`${root}/packs/manifest.json`, 'utf8'))
  const packs = new Map<string, Record<string, string>>(manifest.languages.map((language: { id: string; file: string }) =>
    [language.id, JSON.parse(readFileSync(`${root}/packs/${language.file}`, 'utf8')).messages]))
  const en = packs.get('en')!
  const zh = packs.get('zh')!
  const sources: Record<string, Record<string, Record<string, Record<string, string>>>> = {
    en: JSON.parse(readFileSync(`${root}/locales/en.json`, 'utf8')),
    zh: JSON.parse(readFileSync(`${root}/locales/zh.json`, 'utf8')),
  }
  let total = 0
  for (const [id, { meta }] of Object.entries(buildCardsManifest())) {
    const section = meta.type === 'occupation' || meta.playerActionCardType === 'occupation' ? 'occupations'
      : meta.type === 'major' ? 'improvements' : 'minorImprovements'
    for (const field of ['description', 'rules']) {
      const key = `cardFaces.${id}.${field}`
      const source = strip(en[key] ?? '')
      const target = strip(zh[key] ?? '')
      const queues = new Map<string, Array<Rule | undefined>>()
      const add = (rule: Rule | undefined) => {
        if (!rule) return
        const queue = queues.get(group(rule)) ?? []
        queue.push(rule.ids ? rule : undefined)
        queues.set(group(rule), queue)
      }
      const annotated = source.replace(/__([^_]+)__/g, (_original, label: string, offset: number) => {
        if (label === 'Grain/Vegetable Seeds') {
          add(english.get('Grain Seeds')); add(english.get('Vegetable Seeds'))
          return token(label, { en: label, zh: [], ids: 'grain-seeds,vegetable-seeds' })
        }
        let rule = english.get(label)
        // This card grants the named rule actions rather than using their board spaces.
        if (id === 'D127_HardworkingMan' && label === 'Day Laborer') rule = { ...rule!, ids: '' }
        if (label === 'Major Improvement' && !/^(?:\s*(?:or|and)\s*__[^_]+__)*\s+action space/.test(source.slice(offset + label.length + 4))) {
          rule = { ...rule!, ids: '' }
        }
        add(rule)
        return token(label, rule)
      })
      if (annotated === source && en[key] === source) continue
      const translated = target.replace(/__([^_]+)__/g, (original, label: string) => {
        const bucket = chinese.get(label)
        const queue = bucket ? queues.get(bucket) : undefined
        if (!queue?.length) return original
        return token(label, queue.shift())
      })
      const remaining = [...queues.entries()].filter(([, entries]) => entries.some(Boolean))
      if (remaining.length) throw new Error(`${key}: unmatched Chinese references: ${remaining.map(([name]) => name).join(', ')}`)
      for (const [locale, text] of [['en', annotated], ['zh', translated]]) {
        sources[locale][section] ??= {}
        sources[locale][section][id] ??= {}
        sources[locale][section][id][field] = text
      }
      total++
    }
  }
  for (const locale of ['en', 'zh']) writeFileSync(`${root}/locales/${locale}.json`, JSON.stringify(sources[locale], null, 2) + '\n')
  console.log(`Annotated ${total} card text fields`)
}

annotateActionReferences()
