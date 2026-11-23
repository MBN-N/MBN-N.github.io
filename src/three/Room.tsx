import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial, SpotLight, useTexture } from '@react-three/drei'
import { state } from '../lib/timeline'
import tl from '../content/timeline.json'
import { plasterTexture, tileTexture } from './textures'
import { content } from '../lib/journey'

type Layers = { fg: string; mid: string; bg: string }
export type RoomProps = { variant: 'hall' | 'dark'; layers: Layers }

const PIC_W = 8
const PIC_H = 5
const PIC_Y = 6
const D0 = tl.D0
// depth stack behind the frame plane (z = 0); scaled so it looks flat from the establishing distance
const LAYER_Z = { fg: -0.3, mid: -1.5, bg: -27 }

function holeWall() {
  const s = new THREE.Shape()
  s.moveTo(-20, 0).lineTo(20, 0).lineTo(20, 16).lineTo(-20, 16).lineTo(-20, 0)
  const h = new THREE.Path()
  h.moveTo(-PIC_W / 2, PIC_Y - PIC_H / 2).lineTo(-PIC_W / 2, PIC_Y + PIC_H / 2).lineTo(PIC_W / 2, PIC_Y + PIC_H / 2).lineTo(PIC_W / 2, PIC_Y - PIC_H / 2).lineTo(-PIC_W / 2, PIC_Y - PIC_H / 2)
  s.holes.push(h)
  return new THREE.ShapeGeometry(s)
}

function archGeometry(w: number, h: number) {
  const s = new THREE.Shape()
  const r = w / 2
  s.moveTo(-r, 0).lineTo(r, 0).lineTo(r, h - r)
  s.absarc(0, h - r, r, 0, Math.PI, false)
  s.lineTo(-r, 0)
  return new THREE.ShapeGeometry(s, 24)
}

const NAVY = '#181a2c'

function Sign({ file, x, z, w, rot = 0 }: { file: string; x: number; z: number; w: number; rot?: number }) {
  const tex = useTexture(`/brand/${file}`)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const img = tex.image as { width: number; height: number }
  const lh = w / (img.width / img.height)
  const pw = w + 0.5
  const ph = lh + 0.6
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <mesh position={[0, ph / 2 + 0.25, -0.02]}>
        <boxGeometry args={[pw + 0.12, ph + 0.12, 0.1]} />
        <meshStandardMaterial color={NAVY} roughness={0.5} />
      </mesh>
      <mesh position={[0, ph / 2 + 0.25, 0.04]}>
        <boxGeometry args={[pw, ph, 0.06]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.55} />
      </mesh>
      <mesh position={[0, ph / 2 + 0.25, 0.075]}>
        <planeGeometry args={[w, lh]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0, 0.125, 0]}>
        <boxGeometry args={[pw * 0.5, 0.25, 0.5]} />
        <meshStandardMaterial color={NAVY} roughness={0.6} />
      </mesh>
    </group>
  )
}

function signList() {
  const b = content.logos.map((l) => l.replace('.svg', '.png'))
  const list = b.length >= 4 ? [b[0], b[1], 'stl_new.png', b[2], b[3]] : [b[0], 'stl_new.png', b[0]]
  return list
}

function Layer({ url, z, opaque }: { url: string; z: number; opaque?: boolean }) {
  const tex = useTexture(url)
  tex.colorSpace = THREE.SRGBColorSpace
  const k = (D0 + Math.abs(z)) / D0
  return (
    <mesh position={[0, PIC_Y, z]} scale={[PIC_W * k, PIC_H * k, 1]}>
      <planeGeometry />
      <meshBasicMaterial map={tex} transparent={!opaque} toneMapped={false} fog={false} />
    </mesh>
  )
}

// textures are built once and reused across scenes (no hitch when a scene swaps)
let _tex: ReturnType<typeof buildShared> | null = null
function buildShared() {
  return { plaster: plasterTexture(6, 3, 7), plasterSide: plasterTexture(8, 2, 11), plasterCorr: plasterTexture(5, 1.2, 5), floorTex: tileTexture(5, 7.5, 7), corrFloor: tileTexture(3, 10, 3) }
}
const shared = () => (_tex ??= buildShared())

export function Room({ layers }: RoomProps) {
  const wall = useMemo(holeWall, [])
  const arch = useMemo(() => archGeometry(2.4, 3.1), [])
  const sideArch = useMemo(() => archGeometry(4.2, 9), [])
  const corrArch = useMemo(() => archGeometry(1.7, 4.3), [])
  const { plaster, plasterSide, plasterCorr, floorTex, corrFloor } = shared()
  const signs = useMemo(signList, [])

  const spot = useRef<THREE.SpotLight>(null)
  const fill = useRef<THREE.PointLight>(null)
  useFrame(() => {
    const l = 0.7 + 0.3 * state.roomLight
    if (spot.current) spot.current.intensity = 0.6 * l
    if (fill.current) fill.current.intensity = 60 * l
  })

  const columns = [-9, 9].flatMap((x) => [2, 8, 14, 20].map((z) => [x, z] as const))
  const signX = signs.length === 5 ? [-6.4, -3.3, 0, 3.3, 6.4] : [-4.2, 0, 4.2]
  return (
    <group>
      <fog attach="fog" args={['#f4f5f8', 30, 120]} />
      <ambientLight intensity={2.7} />
      <SpotLight ref={spot} position={[0, 15, 7]} angle={0.6} penumbra={0.9} distance={30} attenuation={6} anglePower={4} intensity={0.6} color="#ffffff" opacity={0.25} />
      <pointLight ref={fill} position={[0, 12, 18]} intensity={60} distance={50} color="#ffffff" />
      {/* floor: white polished tiles with a soft reflection */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 12]}>
        <planeGeometry args={[40, 60]} />
        <MeshReflectorMaterial map={floorTex} color="#ffffff" blur={[300, 80]} resolution={512} mixBlur={1} mixStrength={9} mirror={0.55} roughness={0.4} depthScale={0.8} minDepthThreshold={0.4} maxDepthThreshold={1.2} metalness={0.1} />
      </mesh>
      {/* back wall with the picture opening, side walls, ceiling */}
      <mesh geometry={wall} position={[0, 0, -0.02]}>
        <meshStandardMaterial map={plaster} color="#ffffff" roughness={0.9} />
      </mesh>
      {[-20, 20].map((x) => (
        <mesh key={x} position={[x, 8, 12]} rotation-y={x < 0 ? Math.PI / 2 : -Math.PI / 2}>
          <planeGeometry args={[60, 16]} />
          <meshStandardMaterial map={plasterSide} color="#ffffff" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 16, 12]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[40, 60]} />
        <meshStandardMaterial color="#f4f5f8" />
      </mesh>
      {columns.map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 5, z]}>
          <boxGeometry args={[1.4, 10, 1.4]} />
          <meshStandardMaterial color="#f1f2f5" roughness={0.9} />
        </mesh>
      ))}
      {/* cornices and ceiling ribs */}
      {[10.2, 15.4].map((y) => (
        <mesh key={`co${y}`} position={[0, y, -0.1]}>
          <boxGeometry args={[40, 0.5, 0.5]} />
          <meshStandardMaterial map={plaster} color="#f4f5f8" />
        </mesh>
      ))}
      {[2, 8, 14, 20, 26].map((z) => (
        <mesh key={`rib${z}`} position={[0, 15.7, z]}>
          <boxGeometry args={[40, 0.6, 0.8]} />
          <meshStandardMaterial map={plaster} color="#eceef2" />
        </mesh>
      ))}
      {/* brand navy base stripe along the back wall and side walls */}
      <mesh position={[0, 0.35, 0.04]}>
        <boxGeometry args={[40, 0.18, 0.05]} />
        <meshStandardMaterial color={NAVY} />
      </mesh>
      {[-19.95, 19.95].map((x) => (
        <mesh key={`st${x}`} position={[x, 0.35, 12]}>
          <boxGeometry args={[0.05, 0.18, 60]} />
          <meshStandardMaterial color={NAVY} />
        </mesh>
      ))}
      {/* pale arched window below the picture (back wall) */}
      <mesh geometry={arch} position={[0, 0.02, 0.03]}>
        <meshBasicMaterial color="#e3e8f2" toneMapped={false} />
      </mesh>
      {/* side arcades: soft grey recesses between pillars */}
      {[-19.9, 19.9].flatMap((x) => [2, 8, 14, 20].map((z) => ({ x, z }))).map(({ x, z }) => (
        <mesh key={`a${x}${z}`} geometry={sideArch} position={[x, 0.02, z]} rotation-y={x < 0 ? Math.PI / 2 : -Math.PI / 2}>
          <meshBasicMaterial color="#dfe2e9" />
        </mesh>
      ))}
      {/* frame (black) */}
      {[
        [0, PIC_Y + PIC_H / 2 + 0.2, PIC_W + 0.8, 0.4],
        [0, PIC_Y - PIC_H / 2 - 0.2, PIC_W + 0.8, 0.4],
        [-PIC_W / 2 - 0.2, PIC_Y, 0.4, PIC_H],
        [PIC_W / 2 + 0.2, PIC_Y, 0.4, PIC_H],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.1]}>
          <boxGeometry args={[w, h, 0.3]} />
          <meshStandardMaterial color="#14151f" metalness={0.3} roughness={0.35} />
        </mesh>
      ))}
      {/* depth-separated picture layers behind the frame plane */}
      <Layer url={layers.bg} z={LAYER_Z.bg} opaque />
      <Layer url={layers.mid} z={LAYER_Z.mid} />
      <Layer url={layers.fg} z={LAYER_Z.fg} />
      {/* travel corridor behind the frame plane */}
      <pointLight position={[0, PIC_Y + 1, -5]} intensity={30} distance={16} color="#ffffff" />
      <pointLight position={[0, PIC_Y + 1, -13]} intensity={30} distance={16} color="#ffffff" />
      <pointLight position={[0, PIC_Y + 1, -21]} intensity={30} distance={16} color="#ffffff" />
      {[-4, 4].map((x) => (
        <mesh key={`cw${x}`} position={[x, PIC_Y, -14]} rotation-y={x < 0 ? Math.PI / 2 : -Math.PI / 2}>
          <planeGeometry args={[26, PIC_H + 1]} />
          <meshStandardMaterial map={plasterCorr} color="#ffffff" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, PIC_Y - PIC_H / 2, -14]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[PIC_W, 26]} />
        <meshStandardMaterial map={corrFloor} color="#ffffff" roughness={0.35} metalness={0.1} />
      </mesh>
      <mesh position={[0, PIC_Y + PIC_H / 2 + 0.5, -14]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[PIC_W, 26]} />
        <meshStandardMaterial map={plasterCorr} color="#f1f2f5" roughness={0.95} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => -2.4 - i * 2.9).map((z, i) => (
        <group key={z}>
          {[-3.5, 3.5].map((x) => (
            <mesh key={x} position={[x, PIC_Y, z]}>
              <boxGeometry args={[1, PIC_H + 1, 0.9]} />
              <meshStandardMaterial map={plasterCorr} color={i % 2 ? '#f0f1f4' : '#ffffff'} roughness={0.85} />
            </mesh>
          ))}
          <mesh position={[0, PIC_Y + PIC_H / 2 + 0.2, z]}>
            <boxGeometry args={[PIC_W - 1, 0.7, 0.9]} />
            <meshStandardMaterial map={plasterCorr} color="#eceef2" roughness={0.9} />
          </mesh>
          {i % 2 === 0 &&
            [-3.98, 3.98].map((x) => (
              <mesh key={`r${x}`} geometry={corrArch} position={[x, PIC_Y - PIC_H / 2, z - 1.45]} rotation-y={x < 0 ? Math.PI / 2 : -Math.PI / 2}>
                <meshBasicMaterial color="#dde1ea" />
              </mesh>
            ))}
        </group>
      ))}
      {/* cinematic light-box signs of the exclusive brands (replace the visitor silhouettes) */}
      {signs.map((file, i) => (
        <Suspense key={`${file}${i}`} fallback={null}>
          <Sign file={file} x={signX[i]} z={1.6} w={file === 'stl_new.png' ? 1.9 : 1.0} rot={(i - (signs.length - 1) / 2) * -0.09} />
        </Suspense>
      ))}
    </group>
  )
}
