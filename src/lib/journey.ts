import data from '../content/journeys.json'

export type Scene = (typeof data.journeys.home.scenes)[number]
type Journey = { intro: string[]; logos: string[]; scenes: Scene[] }

export function parseHash() {
  const h = location.hash.replace(/^#\/?/, '')
  const [path, q = ''] = h.split('?')
  const seg = path.split('/').filter(Boolean)
  return { seg, params: new URLSearchParams(q) }
}

const { seg } = parseHash()
const all = data.journeys as unknown as Record<string, Journey>
export const journeyId = seg.length === 0 ? 'home' : seg[0] === 'b' && all[seg[1]] ? seg[1] : null
export const isJourney = journeyId !== null
const j = all[journeyId ?? 'home']
export const content = { scrollPxPerFrame: data.scrollPxPerFrame, intro: j.intro, logos: j.logos, scenes: j.scenes }
