import { describe, expect, it } from 'vitest'
import { compileLanguagePack } from '../build-language-packs'

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
})
