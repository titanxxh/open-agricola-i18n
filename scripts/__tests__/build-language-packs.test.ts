import { describe, expect, it } from 'vitest'
import { compileLanguagePack, splitLanguagePack } from '../build-language-packs'

const cards = { C112_Thresher: { meta: {
  id: 'C112_Thresher', name: 'Thresher', deck: 'C', type: 'occupation' as const,
  desc: ['Buy 1 <GRAIN> for 1 <FOOD>.'], rules: ['Only before the action.'],
}, module: 'C112.ts', reaches: [] } }

describe('standalone language compilation', () => {
  it('completes a new locale from English once, including card text and existing aliases', () => {
    const result = compileLanguagePack('fr', { $name: 'Français', ui: { title: 'Ferme' }, occupations: {
      C112_Thresher: { name: 'Batteur', rules: '' },
    } }, { ui: { title: 'Farm', waiting: 'Waiting for {player}' } }, cards)
    expect(result.messages['ui.title']).toBe('Ferme')
    expect(result.messages['ui.waiting']).toBe('Waiting for {player}')
    expect(result.messages['cardFaces.C112_Thresher.name']).toBe('Batteur')
    expect(result.messages['cards.C112_Thresher.name']).toBe('Batteur')
    expect(result.messages['cardFaces.C112_Thresher.description']).toBe('Buy 1 <GRAIN> for 1 <FOOD>.')
    expect(result.messages['cardFaces.C112_Thresher.rules']).toBe('')
    expect(result.messages).not.toHaveProperty('$name')
  })

  it('ships card text apart from the startup pack and drops the duplicated long text of typed groups', () => {
    const { core, cards: cardText } = splitLanguagePack(compileLanguagePack('fr', { $name: 'Français', ui: { title: 'Ferme' }, parentFaces: { PR01: { text: 'Mère' } }, occupations: {
      C112_Thresher: { name: 'Batteur', choice: 'Choisir' },
    } }, { ui: { title: 'Farm' }, platform: { retry: 'Retry' } }, cards))
    expect(core).toEqual({ version: 1, locale: 'fr', messages: { 'platform.retry': 'Retry', 'ui.title': 'Ferme' } })
    expect(cardText.locale).toBe('fr')
    expect(cardText.messages).toMatchObject({
      'cardFaces.C112_Thresher.name': 'Batteur',
      'cardFaces.C112_Thresher.description': 'Buy 1 <GRAIN> for 1 <FOOD>.',
      'cards.C112_Thresher.name': 'Batteur',
      'occupations.C112_Thresher.name': 'Batteur',
      'occupations.C112_Thresher.choice': 'Choisir',
      'parentFaces.PR01.text': 'Mère',
    })
    expect(Object.keys(cardText.messages).filter(key => /^occupations\.[^.]+\.(description|rules|prerequisite)$/.test(key))).toEqual([])
  })
})
