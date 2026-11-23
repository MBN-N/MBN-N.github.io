import * as THREE from 'three'

/** Procedural stand-in textures (no reference artwork): stone blocks and checker marble. */
function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}
function finish(c: HTMLCanvasElement, rx: number, ry: number) {
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(rx, ry)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

export function stoneTexture(base = 150, rx = 6, ry = 3, seed = 7) {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  const r = rng(seed)
  g.fillStyle = `rgb(${base},${base - 4},${base - 10})`
  g.fillRect(0, 0, 512, 512)
  for (let y = 0; y < 8; y++) {
    const off = y % 2 ? 64 : 0
    for (let x = -1; x < 5; x++) {
      const v = (r() - 0.5) * 36
      g.fillStyle = `rgb(${base + v},${base + v - 4},${base + v - 10})`
      g.fillRect(x * 128 + off + 2, y * 64 + 2, 124, 60)
    }
  }
  g.strokeStyle = 'rgba(20,18,16,.55)'
  g.lineWidth = 3
  for (let y = 0; y <= 8; y++) {
    g.beginPath(); g.moveTo(0, y * 64); g.lineTo(512, y * 64); g.stroke()
    const off = y % 2 ? 64 : 0
    for (let x = -1; x < 5; x++) { g.beginPath(); g.moveTo(x * 128 + off, y * 64); g.lineTo(x * 128 + off, y * 64 + 64); g.stroke() }
  }
  for (let i = 0; i < 2500; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${0.04 * r()})`
    g.fillRect(r() * 512, r() * 512, 2 + r() * 5, 2 + r() * 5)
  }
  return finish(c, rx, ry)
}

export function marbleTexture(light = 205, dark = 70, rx = 10, ry = 14, seed = 3) {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  const r = rng(seed)
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      const l = (x + y) % 2 === 0
      const v = l ? light : dark
      g.fillStyle = `rgb(${v},${v - 4},${v - 10})`
      g.fillRect(x * 128, y * 128, 128, 128)
      g.strokeStyle = `rgba(0,0,0,.25)`
      g.lineWidth = 1
      for (let k = 0; k < 4; k++) {
        g.beginPath(); g.moveTo(x * 128 + r() * 128, y * 128); g.bezierCurveTo(x * 128 + r() * 128, y * 128 + 40, x * 128 + r() * 128, y * 128 + 90, x * 128 + r() * 128, y * 128 + 128); g.stroke()
      }
    }
  g.strokeStyle = 'rgba(0,0,0,.6)'
  g.lineWidth = 2
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke() }
  return finish(c, rx, ry)
}

/** Clean white plaster with faint panel joints (brand look: white room). */
export function plasterTexture(rx = 6, ry = 3, seed = 7) {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  const r = rng(seed)
  g.fillStyle = '#fbfbfc'
  g.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 1800; i++) {
    g.fillStyle = `rgba(20,24,44,${0.012 * r()})`
    g.fillRect(r() * 512, r() * 512, 2 + r() * 6, 2 + r() * 6)
  }
  g.strokeStyle = 'rgba(24,26,44,.10)'
  g.lineWidth = 2
  for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * 256, 0); g.lineTo(i * 256, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 256); g.lineTo(512, i * 256); g.stroke() }
  return finish(c, rx, ry)
}

/** Large white polished tiles with thin grey grout. */
export function tileTexture(rx = 5, ry = 7.5, seed = 3) {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  const r = rng(seed)
  for (let y = 0; y < 2; y++)
    for (let x = 0; x < 2; x++) {
      const v = 246 + Math.floor(r() * 8)
      g.fillStyle = `rgb(${v},${v},${v + 1})`
      g.fillRect(x * 256, y * 256, 256, 256)
    }
  g.strokeStyle = 'rgba(24,26,44,.22)'
  g.lineWidth = 3
  for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * 256, 0); g.lineTo(i * 256, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 256); g.lineTo(512, i * 256); g.stroke() }
  return finish(c, rx, ry)
}
