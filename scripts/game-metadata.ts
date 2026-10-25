import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
export const gameRoot = resolve(process.env.AGRICOLA_GAME_DIR ?? '../open-agricola')
export type CardMeta = {
 id:string; name:string; deck:string; number?:number; type:'occupation'|'minor'|'major'|'playerAction'; playerActionCardType?:'occupation'|'minor'
 desc?:string[]; rules?:string[]; prerequisite?:unknown
 locales?:Record<string,{name:string;desc:string[];rules?:string[];prerequisite?:string}>
}
export type CardsManifest=Record<string,{meta:CardMeta;module:string;reaches:string[]}>
export function buildCardsManifest(_root?:string):CardsManifest{return JSON.parse(readFileSync(resolve(gameRoot,'public/cards-manifest.json'),'utf8'))}
