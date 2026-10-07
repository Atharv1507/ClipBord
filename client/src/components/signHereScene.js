import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

// The 3D half of the "Sign here" section: a hardboard clipboard lying on the table with a
// printed delivery note under a steel clip. A pen glides in and signs it, then a rubber stamp
// lands. Everything is driven by one number, the scroll progress (0..1), via setProgress().
// The copy is in SignHere.jsx; this file only draws.

// ---------- dimensions (world units ~ decimetres) ----------
const BW = 2.3, BH = 3.2, BD = 0.044
const BEV = 0.009
const FRONT = BD / 2 + BEV
const CLIP_S = 0.9
const HINGE_Y = BH / 2 - 0.42
const HV = 0.062
const PW = 1.95, PH = 2.55
const PAPER_TOP = HINGE_Y - 0.05
const PAPER_Y = PAPER_TOP - PH / 2
const PAPER_Z = 0.004
const SURFACE = FRONT + PAPER_Z + 0.002
const TEX_W = 1024, TEX_H = 1339
const TABLE_Z = -(BD / 2 + BEV) // the table, in board coordinates

// When each signature stroke is written, in the 0..1000 "writing" timeline (= progress x 1000).
export const STROKES = [[360, 540], [566, 640], [664, 712]]
const G0 = 250 // the pen starts gliding in
const R1 = 800 // the pen is back at rest beside the board

// The signature, in sheet-texture pixels (1024 x 1339).
export const SIGNATURE = [
  'M232 1118 C 168 1060, 222 990, 272 1012 C 312 1030, 262 1112, 236 1122 C 214 1130, 240 1080, 296 1070 C 330 1064, 318 1112, 340 1108 C 360 1104, 368 1062, 384 1064 C 398 1066, 388 1110, 404 1108 C 424 1104, 432 1046, 452 1050 C 470 1054, 446 1112, 470 1110 C 494 1108, 508 1060, 532 1066 C 552 1072, 532 1106, 556 1104 C 580 1102, 600 1078, 626 1080',
  'M650 1112 C 664 1060, 690 1000, 706 1006 C 722 1014, 694 1092, 680 1112 C 672 1124, 690 1084, 716 1080 C 742 1076, 734 1108, 756 1104 C 778 1100, 790 1086, 810 1088',
  'M206 1150 C 340 1136, 560 1132, 842 1122',
]

// Copy printed on the sheet and the stamp.
const SHEET = {
  title: 'DELIVERY NOTE',
  copy: 'COPY 1 OF 1  /  KEEP IT',
  fields: [['ORDER', '#CB-0719'], ['SHIP TO', "Wherever you're headed"], ['DATE', 'Today, obviously'], ['CARRIER', 'Handle with swagger']],
  contents: ['One oversized fit', 'A little edge', 'Zero boring rules'],
  note: 'leave it with the cool neighbour',
  signLeft: 'RECIPIENT SIGNATURE',
  signRight: 'ARRIVED WITH ATTITUDE',
  footer: 'WEAR IT YOUR WAY.',
  stamp: ['DELIVERED', 'TO YOUR VIBE'],
}

const ACCENTS = { paper: '#C8102E', noir: '#E3120B' }
const INK = '#141a33' // ballpoint, blue-black

// ---------- small helpers ----------
const clamp01 = (x) => Math.min(1, Math.max(0, x))
const span = (p, a, b) => clamp01((p - a) / (b - a))
const smoothstep = (t) => t * t * (3 - 2 * t)
// GSAP's power eases, so the motion matches the rest of the site.
const p1Out = (t) => 1 - (1 - t) ** 2
const p2Out = (t) => 1 - (1 - t) ** 3
const p2In = (t) => t ** 3
const p3Out = (t) => 1 - (1 - t) ** 4
const p3In = (t) => t ** 4

// Seeded so the textures look the same on every visit.
function seeded(seed) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function addNoise(ctx, w, h, amp, rand) {
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amp
    d[i] += n
    d[i + 1] += n
    d[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)
}

// Turns an SVG string into a decoded image, with its fill swapped to `fill`.
async function svgImage(svg, fill) {
  const img = new Image()
  const url = URL.createObjectURL(new Blob([svg.replaceAll('#0d0b09', fill)], { type: 'image/svg+xml' }))
  img.src = url
  try {
    await img.decode()
  } finally {
    URL.revokeObjectURL(url)
  }
  return img
}

// ---------- sheet metal: a rounded plate bent along a profile curve ----------
// Built as one even grid (top, bottom, and a rounded rim), then bent, so the surface stays
// smooth through tight bends. curve: a SplineCurve in (u = down the board from the hinge,
// v = up off the board). Plan coordinates: x across, a = distance along the curve.
function bentPlate({ width, rNear, rFar, thick, curve }) {
  const len = curve.getLength()
  const h = thick * 0.9 // half thickness, rim included
  const NA = Math.max(60, Math.ceil(len / 0.004))
  const NX = 48
  const RIM = 6
  // half width at distance a, following the rounded corners
  const halfW = (a) => {
    const r = a < rNear ? rNear : a > len - rFar ? rFar : 0
    if (!r) return width / 2
    const d = a < rNear ? rNear - a : a - (len - rFar)
    return width / 2 - r + Math.sqrt(Math.max(0, r * r - d * d))
  }
  const P = new THREE.Vector2()
  const T = new THREE.Vector2()
  const bend = (x, a, z, out) => {
    const t = clamp01(a / len)
    curve.getPointAt(t, P)
    curve.getTangentAt(t, T)
    P.addScaledVector(T, a - t * len)
    out.push(-x, -(P.x - T.y * z), P.y + T.x * z)
  }
  const part = (pos, uv, idx) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }
  const uvOf = (x, a, uv) => uv.push(clamp01(0.5 - x / width), clamp01(1 - a / len)) // x is mirrored by bend()

  // top and bottom faces
  const faces = [1, -1].map((side) => {
    const pos = [], uv = [], idx = []
    for (let i = 0; i <= NA; i++) {
      const a = (i / NA) * len, hw = halfW(a)
      for (let j = 0; j <= NX; j++) {
        const x = (j / NX * 2 - 1) * hw
        bend(x, a, side * h, pos)
        uvOf(x, a, uv)
      }
    }
    for (let i = 0; i < NA; i++) {
      for (let j = 0; j < NX; j++) {
        const v = i * (NX + 1) + j, r = v + NX + 1
        if (side > 0) idx.push(v, v + 1, r, v + 1, r + 1, r)
        else idx.push(v, r, v + 1, v + 1, r, r + 1)
      }
    }
    return part(pos, uv, idx)
  })

  // the rim: a rounded edge all the way round, counter-clockwise seen from the top
  const loop = []
  for (let j = 0; j <= NX; j++) loop.push([(j / NX * 2 - 1) * halfW(0), 0])
  for (let i = 1; i <= NA; i++) loop.push([halfW((i / NA) * len), (i / NA) * len])
  for (let j = NX - 1; j >= 0; j--) loop.push([(j / NX * 2 - 1) * halfW(len), len])
  for (let i = NA - 1; i >= 1; i--) loop.push([-halfW((i / NA) * len), (i / NA) * len])
  const pos = [], uv = [], idx = []
  const n = loop.length
  loop.forEach(([x, a], k) => {
    const [x0, a0] = loop[(k - 1 + n) % n], [x1, a1] = loop[(k + 1) % n]
    let ox = a1 - a0, oa = -(x1 - x0) // outward = tangent turned clockwise
    const l = Math.hypot(ox, oa) || 1
    ox /= l
    oa /= l
    for (let q = 0; q <= RIM; q++) {
      const th = (q / RIM) * Math.PI
      const e = h * 0.7 * Math.sin(th)
      bend(x + ox * e, a + oa * e, h * Math.cos(th), pos)
      uvOf(x, a, uv)
    }
  })
  for (let k = 0; k < n; k++) {
    const A = k * (RIM + 1), B = ((k + 1) % n) * (RIM + 1)
    for (let q = 0; q < RIM; q++) idx.push(A + q, A + q + 1, B + q, B + q, A + q + 1, B + q + 1)
  }
  return mergeGeometries([...faces, part(pos, uv, idx)])
}
const spline = (pts) => new THREE.SplineCurve(pts.map(([u, v]) => new THREE.Vector2(u, v)))

// ---------- procedural textures ----------
function hardboardCanvases(lite) {
  const rand = seeded(11)
  const r = (a, b) => a + rand() * (b - a)
  const w = 1024, h = 1424
  const col = makeCanvas(w, h), cg = col.getContext('2d')
  const rough = makeCanvas(w, h), rg = rough.getContext('2d')
  const bump = makeCanvas(w, h), bg = bump.getContext('2d')
  cg.fillStyle = '#6a4529'; cg.fillRect(0, 0, w, h)
  rg.fillStyle = 'rgb(150,150,150)'; rg.fillRect(0, 0, w, h)
  bg.fillStyle = 'rgb(128,128,128)'; bg.fillRect(0, 0, w, h)
  // mottling
  for (let i = 0; i < 90; i++) {
    const x = r(0, w), y = r(0, h), rad = r(60, 320)
    const g = cg.createRadialGradient(x, y, 0, x, y, rad)
    const light = rand() < 0.5
    g.addColorStop(0, light ? 'rgba(190,140,92,0.07)' : 'rgba(38,20,8,0.08)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    cg.fillStyle = g
    cg.fillRect(x - rad, y - rad, rad * 2, rad * 2)
  }
  // fibres: short random strands, hardboard has no grain direction
  const fibres = lite ? 12000 : 26000
  for (let i = 0; i < fibres; i++) {
    const x = r(0, w), y = r(0, h), a = r(0, Math.PI), l = r(2, 7)
    const light = rand() < 0.5
    const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l
    cg.strokeStyle = light ? `rgba(206,158,108,${r(0.04, 0.1)})` : `rgba(30,14,4,${r(0.05, 0.12)})`
    cg.lineWidth = r(0.6, 1.4)
    cg.beginPath(); cg.moveTo(x, y); cg.lineTo(x2, y2); cg.stroke()
    bg.strokeStyle = light ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'
    bg.lineWidth = 1
    bg.beginPath(); bg.moveTo(x, y); bg.lineTo(x2, y2); bg.stroke()
  }
  addNoise(cg, w, h, 16, rand)
  addNoise(bg, w, h, 40, rand)
  addNoise(rg, w, h, 30, rand)
  // handling grime along the edges
  const edge = (x0, y0, x1, y1, gx0, gy0, gx1, gy1) => {
    const g = cg.createLinearGradient(gx0, gy0, gx1, gy1)
    g.addColorStop(0, 'rgba(22,10,3,0.38)'); g.addColorStop(1, 'rgba(22,10,3,0)')
    cg.fillStyle = g; cg.fillRect(x0, y0, x1 - x0, y1 - y0)
  }
  edge(0, 0, 70, h, 0, 0, 70, 0); edge(w - 70, 0, w, h, w, 0, w - 70, 0)
  edge(0, 0, w, 70, 0, 0, 0, 70); edge(0, h - 70, w, h, 0, h, 0, h - 70)
  // worn corners: lighter, smoother
  for (const [x, y] of [[40, 40], [w - 40, 40], [40, h - 40], [w - 40, h - 40], [w * 0.5, h - 20]]) {
    const rad = r(110, 180)
    const g = cg.createRadialGradient(x, y, 0, x, y, rad)
    g.addColorStop(0, 'rgba(176,128,84,0.22)'); g.addColorStop(1, 'rgba(176,128,84,0)')
    cg.fillStyle = g; cg.fillRect(x - rad, y - rad, 2 * rad, 2 * rad)
    const gr = rg.createRadialGradient(x, y, 0, x, y, rad)
    gr.addColorStop(0, 'rgba(70,70,70,0.6)'); gr.addColorStop(1, 'rgba(70,70,70,0)')
    rg.fillStyle = gr; rg.fillRect(x - rad, y - rad, 2 * rad, 2 * rad)
  }
  // scratches
  for (let i = 0; i < 26; i++) {
    let x = r(0, w), y = r(0, h), a = r(0, Math.PI * 2)
    const l = r(30, 220)
    const pts = [[x, y]]
    for (let s = 0; s < 8; s++) { a += r(-0.12, 0.12); x += (Math.cos(a) * l) / 8; y += (Math.sin(a) * l) / 8; pts.push([x, y]) }
    const draw = (g, style, lw) => {
      g.strokeStyle = style; g.lineWidth = lw; g.beginPath()
      pts.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py)))
      g.stroke()
    }
    draw(cg, `rgba(214,170,124,${r(0.12, 0.3)})`, r(0.6, 1.4))
    draw(bg, 'rgba(0,0,0,0.5)', 1.2)
    draw(rg, 'rgba(255,255,255,0.25)', 1.5)
  }
  return { col, rough, bump }
}

function brushedCanvases() {
  const rand = seeded(5)
  const r = (a, b) => a + rand() * (b - a)
  const w = 1024, h = 512
  const rc = makeCanvas(w, h), rg = rc.getContext('2d')
  const bc = makeCanvas(w, h), bg = bc.getContext('2d')
  rg.fillStyle = 'rgb(58,58,58)'; rg.fillRect(0, 0, w, h)
  bg.fillStyle = 'rgb(128,128,128)'; bg.fillRect(0, 0, w, h)
  for (let i = 0; i < 2600; i++) {
    const y = r(0, h), x = r(-w * 0.2, w), l = r(w * 0.2, w * 1.2)
    const light = rand() < 0.5
    rg.strokeStyle = light ? `rgba(255,255,255,${r(0.02, 0.05)})` : `rgba(0,0,0,${r(0.02, 0.06)})`
    rg.lineWidth = r(0.5, 1.6)
    rg.beginPath(); rg.moveTo(x, y); rg.lineTo(x + l, y + r(-1, 1)); rg.stroke()
    bg.strokeStyle = light ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
    bg.lineWidth = r(0.5, 1.2)
    bg.beginPath(); bg.moveTo(x, y); bg.lineTo(x + l, y); bg.stroke()
  }
  return { r: rc, b: bc }
}

function paperGrainCanvas() {
  const rand = seeded(3)
  const r = (a, b) => a + rand() * (b - a)
  const c = makeCanvas(TEX_W, TEX_H), g = c.getContext('2d')
  g.fillStyle = '#F6F4EE'; g.fillRect(0, 0, TEX_W, TEX_H)
  for (let i = 0; i < 2500; i++) {
    const x = r(0, TEX_W), y = r(0, TEX_H), a = r(0, Math.PI), l = r(2, 9)
    g.strokeStyle = rand() < 0.5 ? 'rgba(120,105,80,0.06)' : 'rgba(255,255,255,0.35)'
    g.lineWidth = 0.8
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke()
  }
  addNoise(g, TEX_W, TEX_H, 10, rand)
  const v = g.createRadialGradient(TEX_W / 2, TEX_H / 2, TEX_H * 0.35, TEX_W / 2, TEX_H / 2, TEX_H * 0.78)
  v.addColorStop(0, 'rgba(150,120,80,0)'); v.addColorStop(1, 'rgba(150,120,80,0.1)')
  g.fillStyle = v; g.fillRect(0, 0, TEX_W, TEX_H)
  return c
}

// A darker photo studio with long softboxes, only for the steel and lacquer: chrome needs
// contrast to read as chrome.
function studioScene() {
  const st = new THREE.Scene()
  st.add(new THREE.Mesh(new THREE.BoxGeometry(30, 20, 30), new THREE.MeshBasicMaterial({ color: 0x1a1a1c, side: THREE.BackSide })))
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: 0x5a5753 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -9.9
  st.add(floor)
  const panel = (w, h, x, y, z, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide }))
    m.position.set(x, y, z)
    m.lookAt(0, 0, 0)
    st.add(m)
  }
  panel(18, 2.2, 0, 8, 7, 7) // long overhead strip, in front
  panel(2.4, 14, -10, 1, 6, 5) // tall strip, left
  panel(1.2, 12, 9, 0, 9, 3.2) // thin strip, right
  panel(8, 8, 0, 4, 14, 1.6) // big soft front box
  panel(10, 1.2, 0, -4, 12, 1.2) // low bounce card
  panel(30, 8, 0, 6, -14.5, 0.35) // dim back wall
  return st
}

function disposeScene(st) {
  st.traverse((o) => {
    o.geometry?.dispose()
    ;[o.material].flat().forEach((m) => m?.dispose())
  })
}

/**
 * Builds the scene into `canvas`. Options:
 *  - pin: the element the canvas fills (sizes the renderer)
 *  - frame(): returns where the board should sit, { narrow, top, bottom } in px inside pin
 *  - monogramSvg: the monogram SVG source, for the clip and the pen barrel
 *  - lite: smaller shadow map and textures, for phones
 */
export function createSignHereScene({ canvas, pin, frame, monogramSvg, lite }) {
  const disposables = []
  const keep = (x) => (disposables.push(x), x)
  const tex = (c, srgb) => {
    const t = keep(new THREE.CanvasTexture(c))
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = maxAniso
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    return t
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  // Phones get their full pixel density (up to 3x): the screen is small, so it still costs less
  // than a 2x desktop, and the printed sheet needs it to stay crisp.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lite ? 3 : 2))
  const maxAniso = renderer.capabilities.getMaxAnisotropy()
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const roomEnv = keep(pmrem.fromScene(new RoomEnvironment(), 0.04).texture)
  scene.environment = roomEnv
  const studio = studioScene()
  const steelEnv = keep(pmrem.fromScene(studio, 0.02).texture)
  disposeScene(studio)

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100)
  const key = new THREE.DirectionalLight(0xfff4e8, 2.3)
  key.position.set(-3.4, 8, 4.2)
  key.castShadow = true
  key.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048)
  Object.assign(key.shadow.camera, { left: -3.4, right: 3.4, top: 3.4, bottom: -3.4, near: 1, far: 20 })
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.01
  key.shadow.radius = 4
  const rim = new THREE.DirectionalLight(0xffffff, 0.6)
  rim.position.set(4, 3, -4)
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.08))

  // The table: only its shadows show, the section colour is the table.
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.22 })
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // Hierarchy: place (yaw on the table) > lay (board face up) > board
  const place = new THREE.Group()
  const lay = new THREE.Group()
  const board = new THREE.Group()
  lay.rotation.x = -Math.PI / 2
  lay.position.y = BD / 2 + BEV
  lay.add(board)
  place.add(lay)
  scene.add(place)

  // Soft contact shadow baked under the board.
  const contactCanvas = makeCanvas(512, 640)
  {
    const g = contactCanvas.getContext('2d')
    g.filter = 'blur(22px)'
    g.fillStyle = '#000'
    g.beginPath(); g.roundRect(70, 70, 372, 500, 30); g.fill()
  }
  const contactMat = new THREE.MeshBasicMaterial({ map: tex(contactCanvas), transparent: true, depthWrite: false, color: 0x000000, opacity: 0.4 })
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(BW * 1.32, BH * 1.24), contactMat)
  contact.position.set(0.04, 0, TABLE_Z + 0.001)
  board.add(contact)

  // ---------- the board ----------
  const hbc = hardboardCanvases(lite)
  const hb = { map: tex(hbc.col, true), roughnessMap: tex(hbc.rough), bumpMap: tex(hbc.bump) }
  for (const t of Object.values(hb)) { t.repeat.set(1 / BW, 1 / BH); t.offset.set(0.5, 0.5) }
  const boardShape = new THREE.Shape()
  {
    const r = 0.15, x = -BW / 2, y = -BH / 2
    boardShape.moveTo(x + r, y); boardShape.lineTo(x + BW - r, y); boardShape.quadraticCurveTo(x + BW, y, x + BW, y + r)
    boardShape.lineTo(x + BW, y + BH - r); boardShape.quadraticCurveTo(x + BW, y + BH, x + BW - r, y + BH)
    boardShape.lineTo(x + r, y + BH); boardShape.quadraticCurveTo(x, y + BH, x, y + BH - r)
    boardShape.lineTo(x, y + r); boardShape.quadraticCurveTo(x, y, x + r, y)
  }
  const boardGeo = new THREE.ExtrudeGeometry(boardShape, { depth: BD, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 4, curveSegments: 18 })
  boardGeo.translate(0, 0, -BD / 2)
  const boardFace = new THREE.MeshPhysicalMaterial({
    map: hb.map, roughnessMap: hb.roughnessMap, roughness: 1, bumpMap: hb.bumpMap, bumpScale: 1.2, clearcoat: 0.22, clearcoatRoughness: 0.55,
  })
  const boardSide = new THREE.MeshPhysicalMaterial({ map: hb.map, color: 0x8a7462, roughness: 0.85, bumpMap: hb.bumpMap, bumpScale: 2 })
  const boardMesh = new THREE.Mesh(boardGeo, [boardFace, boardSide])
  boardMesh.receiveShadow = true
  board.add(boardMesh)

  // ---------- the steel clip ----------
  const metal = brushedCanvases()
  const steel = new THREE.MeshPhysicalMaterial({
    color: 0xdcdde1, metalness: 1, roughness: 1, roughnessMap: tex(metal.r), bumpMap: tex(metal.b), bumpScale: 0.012,
    envMap: steelEnv, envMapIntensity: 1.25, anisotropy: 0.5,
  })
  const jawMat = steel.clone()
  const clip = new THREE.Group()
  clip.position.set(0, HINGE_Y, FRONT)
  clip.scale.setScalar(CLIP_S)
  board.add(clip)
  const cast = (m, parent) => {
    m.castShadow = true
    m.receiveShadow = true
    parent.add(m)
    return m
  }
  // base plate, riveted to the board, rising into the hinge
  cast(new THREE.Mesh(bentPlate({ width: 1.2, rNear: 0, rFar: 0.12, thick: 0.01, curve: spline([[0.02, HV - 0.01], [-0.03, 0.03], [-0.08, 0.008], [-0.16, 0.007], [-0.42, 0.007]]) }), steel), clip)
  const rivetGeo = new THREE.SphereGeometry(0.05, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2)
  rivetGeo.rotateX(Math.PI / 2)
  rivetGeo.scale(1, 1, 0.45)
  const ringGeo = new THREE.TorusGeometry(0.05, 0.009, 10, 40)
  for (const x of [-0.45, 0.45]) {
    cast(new THREE.Mesh(rivetGeo, steel), clip).position.set(x, 0.25, 0.012)
    cast(new THREE.Mesh(ringGeo, steel), clip).position.set(x, 0.25, 0.012)
  }
  // hinge barrel + pin heads
  const barrelGeo = new THREE.CylinderGeometry(0.038, 0.038, 1.16, 40, 1)
  barrelGeo.rotateZ(Math.PI / 2)
  cast(new THREE.Mesh(barrelGeo, steel), clip).position.set(0, 0, HV)
  const headGeo = new THREE.CylinderGeometry(0.024, 0.026, 0.03, 28)
  headGeo.rotateZ(Math.PI / 2)
  for (const x of [-0.595, 0.595]) cast(new THREE.Mesh(headGeo, steel), clip).position.set(x, 0, HV)
  // side ears joining base and barrel
  const earShape = new THREE.Shape()
  earShape.moveTo(-0.16, 0.004); earShape.lineTo(0.04, 0.004)
  earShape.quadraticCurveTo(0.06, HV, 0.0, HV + 0.045); earShape.quadraticCurveTo(-0.07, HV + 0.03, -0.16, 0.004)
  const earGeo = new THREE.ExtrudeGeometry(earShape, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, curveSegments: 16 })
  earGeo.applyMatrix4(new THREE.Matrix4().set(0, 0, -1, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1))
  for (const x of [-0.565, 0.579]) cast(new THREE.Mesh(earGeo, steel), clip).position.x = x
  // the jaw (presses the sheet) + lever, pivoting on the barrel
  const jawPivot = new THREE.Group()
  jawPivot.position.z = HV
  clip.add(jawPivot)
  const JAW_W = 1.24
  const jawCurve = spline([[-0.035, 0.03], [0.0, 0.047], [0.05, 0.03], [0.12, -0.022], [0.2, -0.042], [0.4, -0.05], [0.47, -0.047], [0.53, -0.025]])
  const jawGeo = bentPlate({ width: JAW_W, rNear: 0, rFar: 0.1, thick: 0.013, curve: jawCurve })
  cast(new THREE.Mesh(jawGeo, jawMat), jawPivot)
  cast(new THREE.Mesh(bentPlate({ width: 0.62, rNear: 0, rFar: 0.14, thick: 0.013, curve: spline([[0.03, 0.036], [-0.04, 0.072], [-0.13, 0.135], [-0.22, 0.175], [-0.29, 0.18], [-0.335, 0.162]]) }), steel), jawPivot)

  // The curved steel shades itself badly at grazing angles (jagged shadow acne on the lever);
  // its look comes from reflections anyway, so it only casts shadows.
  clip.traverse((o) => (o.receiveShadow = false))

  // ---------- the printed delivery sheet ----------
  const grain = paperGrainCanvas()
  const sheetBase = makeCanvas(TEX_W, TEX_H) // the print, redrawn per theme
  const sheetCanvas = makeCanvas(TEX_W, TEX_H) // print + ink, redrawn as the pen writes
  const sctx = sheetCanvas.getContext('2d')
  const sheetTex = tex(sheetCanvas, true)
  sheetTex.wrapS = sheetTex.wrapT = THREE.ClampToEdgeWrapping
  const paperGeo = new THREE.PlaneGeometry(PW, PH, 20, 26)
  {
    // a gentle bow away from the clip
    const pos = paperGeo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const fx = pos.getX(i) / PW + 0.5, fy = 0.5 - pos.getY(i) / PH
      pos.setZ(i, 0.004 * Math.sin(fx * Math.PI) * fy)
    }
    paperGeo.computeVertexNormals()
  }
  const paper = new THREE.Mesh(paperGeo, new THREE.MeshStandardMaterial({ map: sheetTex, roughness: 0.9, bumpMap: tex(grain), bumpScale: 0.35 }))
  paper.castShadow = true
  paper.receiveShadow = true
  paper.position.set(0, PAPER_Y, FRONT + PAPER_Z)
  board.add(paper)
  const toBoard = (x, y, out) => out.set((x / TEX_W - 0.5) * PW, PAPER_Y + (0.5 - y / TEX_H) * PH, SURFACE)

  let accent = ACCENTS.paper
  function printSheet() {
    const g = sheetBase.getContext('2d')
    g.drawImage(grain, 0, 0)
    const L = 84, R = TEX_W - 84
    const PRINT = 'rgba(22,22,22,0.92)', SOFT = 'rgba(70,66,60,0.85)'
    const mono = (w, px) => `${w} ${px}px "Geist Mono", ui-monospace, monospace`
    g.save()
    g.textBaseline = 'alphabetic'
    // masthead
    g.fillStyle = PRINT
    g.fontStretch = 'condensed'
    g.font = '800 70px "Bricolage Grotesque", sans-serif'
    g.letterSpacing = '-2px'
    g.fillText('CLIPBORD', L, 318)
    g.fontStretch = 'normal'
    g.letterSpacing = '3px'
    g.textAlign = 'right'
    g.font = mono(600, 26); g.fillText(SHEET.title, R, 286)
    g.font = mono(400, 20); g.fillStyle = SOFT; g.fillText(SHEET.copy, R, 318)
    g.textAlign = 'left'
    g.fillStyle = PRINT; g.fillRect(L, 342, R - L, 4)
    // fields
    SHEET.fields.forEach(([k, v], i) => {
      const y = 404 + i * 54
      g.letterSpacing = '3px'; g.font = mono(500, 20); g.fillStyle = SOFT; g.fillText(k, L, y)
      g.letterSpacing = '0px'; g.font = '500 30px "Geist", sans-serif'; g.fillStyle = PRINT; g.fillText(v, L + 210, y)
      g.fillStyle = 'rgba(22,22,22,0.18)'; g.fillRect(L + 210, y + 14, R - L - 210, 2)
    })
    // contents table
    let y = 650
    g.fillStyle = PRINT; g.fillRect(L, y - 34, R - L, 2)
    g.letterSpacing = '3px'; g.font = mono(500, 20); g.fillStyle = SOFT
    g.fillText('QTY', L, y); g.fillText('CONTENTS', L + 120, y)
    g.textAlign = 'right'; g.fillText('STATUS', R, y); g.textAlign = 'left'
    g.fillStyle = PRINT; g.fillRect(L, y + 18, R - L, 2)
    SHEET.contents.forEach((d, i) => {
      const ry = y + 70 + i * 52
      g.letterSpacing = '1px'; g.font = mono(500, 26); g.fillStyle = PRINT; g.fillText('01', L, ry)
      g.letterSpacing = '0px'; g.font = '400 28px "Geist", sans-serif'; g.fillText(d, L + 120, ry)
      g.textAlign = 'right'; g.letterSpacing = '2px'; g.font = mono(600, 22); g.fillText('PACKED', R, ry); g.textAlign = 'left'
      g.fillStyle = 'rgba(22,22,22,0.14)'; g.fillRect(L, ry + 18, R - L, 2); g.fillStyle = PRINT
    })
    // notes, filled in by hand at the counter
    y = 900
    g.letterSpacing = '3px'; g.font = mono(500, 20); g.fillStyle = SOFT; g.fillText('NOTES', L, y)
    g.letterSpacing = '0px'; g.font = '600 46px "Caveat", cursive'; g.fillStyle = INK
    g.save(); g.translate(L + 140, y + 6); g.rotate(-0.025); g.fillText(SHEET.note, 0, 0); g.restore()
    // sign here
    g.letterSpacing = '4px'; g.font = mono(600, 22); g.fillStyle = accent
    g.fillText('SIGN HERE', L, 986)
    g.fillRect(L, 996, 150, 3)
    g.letterSpacing = '0px'; g.font = '300 64px "Geist", sans-serif'; g.fillStyle = PRINT
    g.fillText('×', L + 4, 1142)
    g.fillRect(L + 60, 1134, R - L - 60, 3)
    g.letterSpacing = '3px'; g.font = mono(400, 18); g.fillStyle = SOFT
    g.fillText(SHEET.signLeft, L + 60, 1172)
    g.textAlign = 'right'; g.fillText(SHEET.signRight, R, 1172); g.textAlign = 'left'
    // footer: tagline + barcode
    g.fillStyle = PRINT; g.fillRect(L, 1210, R - L, 2)
    g.letterSpacing = '2px'; g.font = mono(500, 20); g.fillText(SHEET.footer, L, 1262)
    const rnd = seeded(7)
    let bx = R - 300
    while (bx < R) {
      const bw = 2 + Math.floor(rnd() * 4) * 2
      if (rnd() > 0.35) g.fillRect(bx, 1236, bw, 52)
      bx += bw + 3
    }
    g.restore()
  }

  // ---------- the rubber stamp and its impression ----------
  const STAMP = { x: 690, y: 820, a: -0.2, w: 400, h: 190 }
  const impression = makeCanvas(STAMP.w, STAMP.h)
  function inkStamp() {
    const rand = seeded(19)
    const r = (a, b) => a + rand() * (b - a)
    const g = impression.getContext('2d'), w = STAMP.w, h = STAMP.h
    g.clearRect(0, 0, w, h)
    g.save()
    g.fillStyle = accent; g.strokeStyle = accent
    g.lineWidth = 9; g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 18); g.stroke()
    g.lineWidth = 2.5; g.beginPath(); g.roundRect(22, 22, w - 44, h - 44, 10); g.stroke()
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'
    g.fontStretch = 'condensed'; g.letterSpacing = '0px'
    g.font = '800 92px "Bricolage Grotesque", sans-serif'
    g.fillText(SHEET.stamp[0], w / 2, 112, w - 72) // maxWidth: stays inside the border
    g.fontStretch = 'normal'; g.letterSpacing = '7px'
    g.font = '600 25px "Geist Mono", monospace'
    g.fillText(SHEET.stamp[1], w / 2 + 3, 152, w - 72)
    g.restore()
    // wear: pin-holes, dry streaks and a lighter edge where the stamp rocked
    g.save()
    g.globalCompositeOperation = 'destination-out'
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(0,0,0,${r(0.3, 1)})`; g.fillRect(r(0, w), r(0, h), r(0.8, 2.6), r(0.8, 2.2)) }
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(0,0,0,${r(0.15, 0.5)})`
      g.beginPath(); g.ellipse(r(0, w), r(0, h), r(6, 26), r(2, 7), r(-0.3, 0.3), 0, Math.PI * 2); g.fill()
    }
    const side = g.createLinearGradient(0, 0, w, h)
    side.addColorStop(0, 'rgba(0,0,0,0)'); side.addColorStop(0.6, 'rgba(0,0,0,0.08)'); side.addColorStop(1, 'rgba(0,0,0,0.5)')
    g.fillStyle = side; g.fillRect(0, 0, w, h)
    g.restore()
  }

  const stampRed = new THREE.MeshPhysicalMaterial({ color: 0xa30f1c, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.12, envMap: steelEnv, envMapIntensity: 0.9 })
  const lacquerBlack = new THREE.MeshPhysicalMaterial({ color: 0x0d0d0f, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.04, envMap: steelEnv, envMapIntensity: 1.1 })
  const stampOuter = new THREE.Group()
  const stamp = new THREE.Group()
  stamp.rotation.x = Math.PI / 2
  stampOuter.add(stamp)
  board.add(stampOuter)
  const stampPart = (geo, mat, y) => (cast(new THREE.Mesh(geo, mat), stamp).position.y = y)
  stampPart(new RoundedBoxGeometry(0.78, 0.026, 0.37, 2, 0.008), new THREE.MeshStandardMaterial({ color: 0x4a0d10, roughness: 0.9 }), 0.013)
  stampPart(new RoundedBoxGeometry(0.82, 0.03, 0.41, 2, 0.01), new THREE.MeshStandardMaterial({ color: 0x2b2a28, roughness: 0.95 }), 0.04)
  stampPart(new RoundedBoxGeometry(0.86, 0.15, 0.45, 4, 0.04), stampRed, 0.125)
  stampPart(new THREE.LatheGeometry([[0.13, 0], [0.12, 0.012], [0.075, 0.05], [0.058, 0.12], [0.06, 0.2], [0.1, 0.27], [0.125, 0.32], [0.118, 0.37], [0.08, 0.4], [0, 0.41]].map(([r, y]) => new THREE.Vector2(r, y)), 64), lacquerBlack, 0.2)

  // ---------- the pen: glossy black barrel, chrome tip and clip, monogram on the barrel ----------
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xeeeef0, metalness: 1, roughness: 0.07, envMap: steelEnv, envMapIntensity: 1.35 })
  const barrelCanvas = makeCanvas(256, 720)
  {
    const g = barrelCanvas.getContext('2d')
    g.fillStyle = '#0d0d0f'
    g.fillRect(0, 0, 256, 720)
  }
  const barrelTex = tex(barrelCanvas, true)
  barrelTex.wrapT = THREE.ClampToEdgeWrapping
  const barrelMat = new THREE.MeshPhysicalMaterial({ map: barrelTex, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.04, envMap: steelEnv, envMapIntensity: 1.1 })
  const gripMat = new THREE.MeshPhysicalMaterial({ color: 0x111113, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.4, envMap: steelEnv, envMapIntensity: 0.8 })
  const pen = new THREE.Group() // origin = ball tip, axis = +Y
  const penPart = (geo, mat, y = 0) => {
    const m = cast(new THREE.Mesh(geo, mat), pen)
    m.position.y = y
    return m
  }
  const lathe = (pts, mat) => penPart(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 64), mat)
  const cyl = (r0, r1, y0, y1, mat) => penPart(new THREE.CylinderGeometry(r1, r0, y1 - y0, 64, 1), mat, (y0 + y1) / 2)
  penPart(new THREE.SphereGeometry(0.0055, 20, 12), chrome, 0.0055)
  lathe([[0.003, 0.004], [0.007, 0.012], [0.016, 0.05], [0.033, 0.15], [0.039, 0.175], [0.041, 0.18]], chrome)
  cyl(0.041, 0.044, 0.18, 0.42, gripMat)
  lathe([[0.044, 0.42], [0.047, 0.424], [0.047, 0.44], [0.046, 0.444]], chrome)
  cyl(0.046, 0.046, 0.444, 1.02, barrelMat)
  lathe([[0.046, 1.02], [0.048, 1.024], [0.048, 1.046], [0.047, 1.05]], chrome)
  cyl(0.047, 0.045, 1.05, 1.42, lacquerBlack)
  lathe([[0.045, 1.42], [0.044, 1.43], [0.034, 1.455], [0.016, 1.468], [0.0, 1.47]], chrome)
  // pocket clip: a chrome strip riding the cap, ball foot at the bottom
  penPart(bentPlate({ width: 0.034, rNear: 0.006, rFar: 0.016, thick: 0.01, curve: spline([[0, 0.035], [0.025, 0.064], [0.1, 0.064], [0.38, 0.058], [0.43, 0.054]]) }), chrome, 1.42)
  const foot = penPart(new THREE.SphereGeometry(0.016, 24, 16), chrome)
  foot.scale.set(1, 1.3, 0.75)
  foot.position.set(0, 0.995, 0.06)
  board.add(pen)

  // The monogram: embossed on the clip's jaw, printed on the pen barrel.
  async function applyMonogram() {
    if (!monogramSvg) return
    try {
      const [white, bone] = await Promise.all([svgImage(monogramSvg, '#ffffff'), svgImage(monogramSvg, '#ece9e2')])
      if (disposed) return
      // jaw: bump + a touch of grime in the recess, drawn into the jaw's planar UVs
      // canvas x = across the jaw, canvas y = distance along it from the hinge
      const len = jawCurve.getLength()
      const W = 1024, H = Math.round((1024 * len) / JAW_W)
      const mh = 0.3 * (W / JAW_W), mw = (mh * 161) / 293
      // the flat face of the jaw, where u (down the board) is 0.285
      const lens = jawCurve.getLengths(200)
      let k = 0
      while (k < 200 && jawCurve.getPoint(k / 200).x < 0.285) k++
      const cx = W / 2, cy = (lens[k] / len) * H
      const b = makeCanvas(W, H), bg = b.getContext('2d')
      bg.fillStyle = 'rgb(128,128,128)'; bg.fillRect(0, 0, W, H)
      bg.filter = 'blur(2.2px)'; bg.globalAlpha = 0.95
      bg.drawImage(white, cx - mw / 2, cy - mh / 2, mw, mh)
      const r = makeCanvas(W, H), rg = r.getContext('2d')
      rg.drawImage(metal.r, 0, 0, W, H)
      rg.filter = 'blur(3px)'; rg.globalAlpha = 0.25
      rg.drawImage(white, cx - mw / 2, cy - mh / 2, mw, mh)
      const c = makeCanvas(W, H), cg = c.getContext('2d')
      cg.fillStyle = '#ffffff'; cg.fillRect(0, 0, W, H)
      const dark = makeCanvas(W, H), dg = dark.getContext('2d')
      dg.filter = 'blur(5px)'; dg.drawImage(white, cx - mw / 2, cy - mh / 2, mw, mh)
      dg.filter = 'none'; dg.globalCompositeOperation = 'source-in'; dg.fillStyle = '#7d7a76'; dg.fillRect(0, 0, W, H)
      cg.globalAlpha = 0.55; cg.drawImage(dark, 0, 0)
      jawMat.bumpMap = tex(b); jawMat.bumpScale = 1.6 // just the monogram: streaks here turn to sawtooth on the bend
      jawMat.roughnessMap = tex(r)
      jawMat.map = tex(c, true)
      for (const t of [jawMat.bumpMap, jawMat.roughnessMap, jawMat.map]) t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
      jawMat.needsUpdate = true

      // barrel: canvas y = 0 is the top; the side at u = 0.25 faces up while writing
      const g = barrelCanvas.getContext('2d'), BWp = 256, BHp = 720
      const pxU = BWp / (2 * Math.PI * 0.046), pxV = BHp / 0.576
      const u = BWp * 0.25
      g.globalAlpha = 0.92
      g.drawImage(bone, u - (0.1 * 161 / 293 * pxU) / 2, BHp * 0.16, 0.1 * 161 / 293 * pxU, 0.1 * pxV)
      g.globalAlpha = 1
      g.save(); g.translate(u, BHp * 0.42); g.rotate(Math.PI / 2)
      g.fillStyle = '#ece9e2'; g.font = '800 34px "Bricolage Grotesque", sans-serif'; g.fontStretch = 'condensed'; g.letterSpacing = '4px'
      g.textBaseline = 'middle'; g.scale(1, pxU / pxV)
      g.fillText('CLIPBORD', 0, 0)
      g.restore()
      barrelTex.needsUpdate = true
      dirty = true
    } catch {
      // decoration only: the clip and pen still read without it
    }
  }

  // ---------- the signature ----------
  // Each stroke sampled once into points, so drawing part of it and placing the pen tip are
  // both cheap lookups.
  const sigPts = SIGNATURE.map((d) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    el.setAttribute('d', d)
    const len = el.getTotalLength()
    const n = Math.ceil(len / 3)
    const pts = new Float32Array((n + 1) * 2)
    for (let i = 0; i <= n; i++) {
      const p = el.getPointAtLength((i / n) * len)
      pts[i * 2] = p.x
      pts[i * 2 + 1] = p.y
    }
    return { pts, n }
  })
  function sigAt(i, f) {
    const { pts, n } = sigPts[i]
    const x = clamp01(f) * n
    const k = Math.min(Math.floor(x), n - 1), t = x - k
    return [pts[k * 2] + (pts[k * 2 + 2] - pts[k * 2]) * t, pts[k * 2 + 1] + (pts[k * 2 + 3] - pts[k * 2 + 1]) * t]
  }
  function drawSig(i, f) {
    if (f <= 0) return
    const { pts, n } = sigPts[i]
    const end = clamp01(f) * n
    sctx.beginPath()
    sctx.moveTo(pts[0], pts[1])
    for (let k = 1; k <= Math.floor(end); k++) sctx.lineTo(pts[k * 2], pts[k * 2 + 1])
    const [ex, ey] = sigAt(i, f)
    sctx.lineTo(ex, ey)
    sctx.stroke()
  }

  // ---------- state, from scroll progress ----------
  const S = { p: 0, settle: 0, T: 0, stampH: 6, stampX: 0, squish: 0, ink: 0 }
  function setProgress(p) {
    S.p = p
    S.settle = p3Out(span(p, 0, 0.2))
    S.T = p * 1000
    // the stamp: drops, squashes, inks the sheet, lifts away to the right
    if (p < 0.9) {
      S.stampH = 6 * (1 - p3In(span(p, 0.79, 0.85)))
      S.stampX = 0
    } else {
      const k = p2In(span(p, 0.9, 0.98))
      S.stampH = 6 * k
      S.stampX = 1.4 * k
    }
    S.squish = p < 0.875 ? p2Out(span(p, 0.85, 0.862)) : 1 - p2In(span(p, 0.875, 0.895))
    S.ink = p1Out(span(p, 0.85, 0.868))
    dirty = true
  }

  // ---------- drawing the sheet (only when the ink actually changed) ----------
  let printed = ''
  function redrawSheet() {
    const f = STROKES.map(([a, b]) => span(S.T, a, b))
    const sig = `${f.map((x) => x.toFixed(4)).join()}|${S.ink.toFixed(3)}|${accent}`
    if (sig === printed) return
    printed = sig
    sctx.drawImage(sheetBase, 0, 0)
    sctx.save()
    sctx.strokeStyle = INK
    sctx.lineWidth = 4.6
    sctx.lineCap = 'round'
    sctx.lineJoin = 'round'
    sctx.shadowColor = INK
    sctx.shadowBlur = 1.2
    sctx.globalAlpha = 0.9
    f.forEach((x, i) => drawSig(i, x))
    sctx.restore()
    if (S.ink > 0.001) {
      sctx.save()
      sctx.globalCompositeOperation = 'multiply'
      sctx.globalAlpha = 0.9 * S.ink
      sctx.translate(STAMP.x, STAMP.y)
      sctx.rotate(STAMP.a)
      sctx.drawImage(impression, -STAMP.w / 2, -STAMP.h / 2)
      sctx.restore()
    }
    sheetTex.needsUpdate = true
  }

  // ---------- posing the pen and stamp ----------
  const up = new THREE.Vector3(0, 1, 0)
  const WRITE_DIR = new THREE.Vector3(0.5, -0.5, 0.9).normalize()
  const AWAY = new THREE.Vector3(BW / 2 + 2.2, -BH / 2 - 0.6, 2.4)
  // How the board lies and where the pen ends up. Desktop: turned on the table, pen beside it.
  // Phones: squarer to the camera and seen more from above so the board fills the tall space,
  // and the pen is dropped across the foot of the sheet instead of widening the shot.
  const LAYOUTS = {
    wide: { yaw: 0.34, el: 0.98, rest: new THREE.Vector3(BW / 2 + 0.36, -1.05, TABLE_Z + 0.047), restDir: new THREE.Vector3(0.14, 1, 0).normalize() },
    narrow: { yaw: 0.14, el: 1.12, rest: new THREE.Vector3(-0.72, -1.27, SURFACE + 0.047), restDir: new THREE.Vector3(1, 0.1, 0).normalize() },
  }
  let L = LAYOUTS.wide
  const qWrite = new THREE.Quaternion(), qRest = new THREE.Quaternion()
  const qSpinW = new THREE.Quaternion().setFromAxisAngle(up, -2.2)
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3()
  const sigPoint = (i, f, out) => {
    const [x, y] = sigAt(i, f)
    return toBoard(x, y, out)
  }
  function posePen() {
    const T = S.T
    const pos = pen.position
    const last = STROKES[STROKES.length - 1][1]
    let lift = 0, rest = 0, wob = 0
    if (T <= G0) {
      pos.copy(AWAY)
    } else if (T < STROKES[0][0]) {
      const k = smoothstep((T - G0) / (STROKES[0][0] - G0))
      sigPoint(0, 0, _b)
      pos.lerpVectors(AWAY, _b, k)
      lift = 0.12 * Math.sin(k * Math.PI) * (1 - k) + 0.02 * (1 - k)
    } else if (T > last) {
      const k = smoothstep(Math.min(1, (T - last) / (R1 - last)))
      sigPoint(SIGNATURE.length - 1, 1, _a)
      pos.lerpVectors(_a, L.rest, k)
      lift = 0.5 * Math.sin(k * Math.PI)
      rest = k
    } else {
      for (let i = 0; i < STROKES.length; i++) {
        const [a, b] = STROKES[i]
        if (T >= a && T <= b) {
          wob = (T - a) / (b - a)
          sigPoint(i, wob, pos)
          break
        }
        const next = STROKES[i + 1]
        if (next && T > b && T < next[0]) {
          const k = smoothstep((T - b) / (next[0] - b))
          sigPoint(i, 1, _a)
          sigPoint(i + 1, 0, _b)
          pos.lerpVectors(_a, _b, k)
          lift = 0.09 * Math.sin(k * Math.PI)
          break
        }
      }
    }
    pos.z += lift
    // a touch more upright when lifted, a small wobble from the wrist while writing
    _d.copy(WRITE_DIR)
    _d.x += 0.05 * Math.sin(wob * 18) - lift * 0.5
    _d.y += lift * 0.4
    _d.normalize()
    qWrite.setFromUnitVectors(up, _d).multiply(qSpinW)
    qRest.setFromUnitVectors(up, L.restDir)
    pen.quaternion.slerpQuaternions(qWrite, qRest, rest)
  }
  function poseStamp() {
    const h = S.stampH
    stampOuter.visible = h < 5.5
    toBoard(STAMP.x, STAMP.y, stampOuter.position)
    stampOuter.position.x += S.stampX
    stampOuter.position.z = SURFACE + h
    stampOuter.rotation.set(0.05 * Math.min(h, 1), -0.08 * Math.min(h, 1), -STAMP.a + 0.22 * Math.min(h / 3, 1))
    stamp.scale.y = 1 - 0.06 * S.squish
  }

  // ---------- camera ----------
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
  const CAM = { az: 0, dist: 10 }
  const target = new THREE.Vector3()
  function placeCamera() {
    const az = CAM.az + pointer.x * 0.14
    const el = L.el - pointer.y * 0.07
    camera.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(CAM.dist).add(target)
    camera.lookAt(target)
  }

  // Fit the lying board (and, on desktop, the pen resting beside it) into the free space:
  // right half on desktop, between the headline and the copy on phones.
  const _v = new THREE.Vector3()
  function fitPoints() {
    const pts = [[-BW / 2, -BH / 2, FRONT], [BW / 2, -BH / 2, FRONT], [-BW / 2, BH / 2, FRONT + 0.2], [BW / 2, BH / 2, FRONT + 0.2]]
    if (L === LAYOUTS.wide) pts.push([L.rest.x + 0.1, L.rest.y, L.rest.z], [L.rest.x, L.rest.y + 1.47, L.rest.z])
    const saveR = place.rotation.y, saveP = place.position.clone()
    place.rotation.y = L.yaw
    place.position.set(0, 0, 0)
    place.updateMatrixWorld(true)
    const out = pts.map((p) => board.localToWorld(new THREE.Vector3(...p)))
    place.rotation.y = saveR
    place.position.copy(saveP)
    place.updateMatrixWorld(true)
    return out
  }
  function resize() {
    const w = pin.clientWidth, h = pin.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const f = frame()
    L = f.narrow ? LAYOUTS.narrow : LAYOUTS.wide
    let bw, bh, cx, cy
    if (f.narrow) {
      bh = Math.max(160, f.bottom - f.top)
      bw = w * 0.96
      cx = w / 2
      cy = (f.top + f.bottom) / 2
    } else {
      bh = h * 0.84
      bw = w * 0.46
      cx = w * 0.69
      cy = h * 0.5
    }
    const pts = fitPoints()
    target.set(0, 0, 0)
    pts.forEach((p) => target.add(p))
    target.divideScalar(pts.length)
    target.y = 0
    camera.clearViewOffset()
    const measure = () => {
      placeCamera()
      camera.updateMatrixWorld()
      camera.updateProjectionMatrix()
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
      for (const p of pts) {
        _v.copy(p).project(camera)
        x0 = Math.min(x0, _v.x); x1 = Math.max(x1, _v.x); y0 = Math.min(y0, _v.y); y1 = Math.max(y1, _v.y)
      }
      return { pw: ((x1 - x0) / 2) * w, ph: ((y1 - y0) / 2) * h, mx: (((x0 + x1) / 2 + 1) / 2) * w, my: ((1 - (y0 + y1) / 2) / 2) * h }
    }
    const sx = pointer.x, sy = pointer.y
    pointer.x = pointer.y = 0
    CAM.dist = 10
    for (let i = 0; i < 3; i++) {
      const m = measure()
      CAM.dist *= Math.max(m.pw / bw, m.ph / bh)
    }
    const m = measure()
    camera.setViewOffset(w, h, m.mx - cx, m.my - cy, w, h)
    camera.updateProjectionMatrix()
    pointer.x = sx
    pointer.y = sy
    dirty = true
  }

  // ---------- theme ----------
  function applyTheme(mode) {
    const noir = mode === 'noir'
    accent = noir ? ACCENTS.noir : ACCENTS.paper
    groundMat.opacity = noir ? 0.6 : 0.22
    contactMat.opacity = noir ? 0.75 : 0.4
    renderer.toneMappingExposure = noir ? 0.92 : 1.0
    key.intensity = noir ? 2.1 : 2.3
    rim.intensity = noir ? 1.4 : 0.5
    scene.environmentIntensity = noir ? 0.72 : 0.9
    stampRed.color.set(noir ? 0xb8121c : 0xa30f1c)
    reprint()
  }
  // Call again once the web fonts have loaded: the sheet is text drawn into a canvas.
  function reprint() {
    printSheet()
    inkStamp()
    printed = ''
    dirty = true
  }

  // ---------- frame ----------
  let dirty = true
  let disposed = false
  function setPointer(x, y) {
    pointer.tx = x
    pointer.ty = y
  }
  // Called every frame while the section is on screen; draws only when something changed.
  function frame_() {
    const dx = pointer.tx - pointer.x, dy = pointer.ty - pointer.y
    if (Math.abs(dx) > 0.0005 || Math.abs(dy) > 0.0005) {
      pointer.x += dx * 0.06
      pointer.y += dy * 0.06
      dirty = true
    }
    if (!dirty) return
    dirty = false
    place.rotation.y = THREE.MathUtils.lerp(L.yaw + 0.5, L.yaw, S.settle)
    place.position.set(THREE.MathUtils.lerp(1.4, 0, S.settle), 0, THREE.MathUtils.lerp(-1.2, 0, S.settle))
    posePen()
    poseStamp()
    placeCamera()
    redrawSheet()
    renderer.render(scene, camera)
  }

  function dispose() {
    disposed = true
    disposeScene(scene)
    disposables.forEach((d) => d.dispose())
    pmrem.dispose()
    renderer.dispose()
  }

  reprint()
  setProgress(0)
  resize()
  applyMonogram()

  return { setProgress, setPointer, applyTheme, reprint, resize, frame: frame_, dispose }
}
