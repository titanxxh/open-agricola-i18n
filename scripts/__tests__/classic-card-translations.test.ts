import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compileLanguagePack } from '../build-language-packs'
import { flattenDictionary } from '../i18n/flatten-dictionary'

const source = (locale: string) => JSON.parse(readFileSync(resolve(`locales/${locale}.json`), 'utf8'))
const decks = ['CBI', 'CC', 'CE', 'CFL', 'CFR', 'CG', 'CI', 'CK', 'CNL', 'CO', 'CPI', 'CWA', 'CWM', 'CZ']

describe('classic translation sources', () => {
  it.each(['en', 'zh'])('uses unambiguous IDs in %s keys, embedded references and compiled faces', locale => {
    const data = source(locale)
    const pack = compileLanguagePack(locale, data, source('en'), {})
    expect(JSON.stringify(data)).not.toContain('OLD_')
    expect(JSON.stringify(pack)).not.toContain('OLD_')
    for (const deck of decks) expect(pack.messages[`ui.encyclopedia.groups.${deck}`]).toBeTruthy()
    for (const key of ['edition', 'revisedEdition', 'classicEdition', 'classicPreviewNote', 'classicReferenceOnly']) {
      expect(pack.messages).not.toHaveProperty(`platform.${key}`)
    }
  })

  it('retains Chinese card faces while deferring unverified English instead of shipping Chinese as English', () => {
    const english = source('en')
    const chinese = source('zh')
    const englishKeys = [...flattenDictionary(english)]
    const classicEnglish = englishKeys.filter(([key]) => /(?:^|\.)C[A-Z]+\d{3}_/.test(key))
    expect(classicEnglish.filter(([, text]) => /[\u3400-\u9fff]/.test(text))).toEqual([])
    const cards = (data: typeof chinese) => ['occupations', 'minorImprovements']
      .flatMap(group => Object.keys(data[group]).filter(id => /^C[A-Z]+\d{3}_/.test(id)))
    expect(cards(chinese)).toHaveLength(1024)
    expect(cards(english).sort()).toEqual(['CE203_Shepherd', 'CI097_Slaughterhouse'])
    const en = compileLanguagePack('en', english, english, {}).messages
    const zh = compileLanguagePack('zh', chinese, english, {}).messages
    expect(en['cardFaces.CE203_Shepherd.name']).toBe('Shepherd')
    expect(zh['cardFaces.CE203_Shepherd.name']).toBe('牧羊人')
    expect(en['cardFaces.CI097_Slaughterhouse.name']).toBe('Slaughterhouse')
    expect(zh['cardFaces.CI097_Slaughterhouse.name']).toBe('屠宰场')
    expect(en['cardFaces.CI097_Slaughterhouse.description']).toContain('1 <food>')
    expect(zh['cardFaces.CI097_Slaughterhouse.rules']).toContain('相对顺序')
  })
})
