import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import TwistText from '../lib/TwistText'

gsap.registerPlugin(ScrollTrigger)

const MODEL_URL = '/models/honda_civic_type_r.glb'
const CAR_LENGTH = 4.6
const CAR_RE = /body_white_ext|tire|tyre|headlight/i
const TYRE_RE = /tire|tyre/i
const TARGET = new THREE.Vector3(0, 0.7, 0)
// World positions once the car is centred at the origin, nose toward +X, right-hand side toward +Z.
const DOOR_OUT = new THREE.Vector3(-0.55, 1.05, 2.5)   // outside, beside the rear door
const DOOR_IN = new THREE.Vector3(-0.55, 1.05, 0.7)    // through the open rear door, at the threshold
const CABIN = new THREE.Vector3(-0.15, 1.02, 0.2)      // seated, between the front seats and dash
const PAINTS = [
  { name: 'Championship White', hex: '#f2f2ef' },
  { name: 'Rally Red', hex: '#c8102e' },
  { name: 'Crystal Black Pearl', hex: '#101216' },
]

// Hotspots. Anchors are fractions of the car's measured body box (length and width -0.5..0.5, height 0..1).
const SPOTS = [
  { id: 'engine', label: '2.0L K20C1 VTEC TURBO', fx: 0.32, fy: 0.55, fz: 0, side: 'left' as const, title: 'K20C1 turbo engine', text: '2.0-litre direct-injection turbo four, with 420 Nm of torque from 2,600 to 4,000 rpm.', cabin: false },
  { id: 'cockpit', label: 'INSIDE THE COCKPIT', fx: 0.05, fy: 0.7, fz: 0.1, side: 'right' as const, title: 'Inside the cockpit', text: 'Driver-focused interior with red stitching on the sport seats. Drag to look around.', cabin: true },
  { id: 'gearbox', label: '6-SPEED MANUAL', fx: -0.02, fy: 0.2, fz: 0, side: 'left' as const, title: '6-speed manual', text: 'Row-your-own gearbox. The Type R is manual only.', cabin: false },
  { id: 'diff', label: 'MECHANICAL LIMITED-SLIP DIFF', fx: -0.34, fy: 0.2, fz: -0.45, side: 'right' as const, title: 'Limited-slip differential', text: 'A mechanical limited-slip differential helps the front wheels put power down out of corners.', cabin: false },
]

type Mode = 'scroll' | 'fly' | 'free' | 'cabin'

// Bounds of the meshes whose material name matches, measured from their real vertices.
function boundsOf(root: THREE.Object3D, re: RegExp) {
  const b = new THREE.Box3()
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const mat = Array.isArray(m.material) ? m.material[0] : m.material
    if (re.test(mat.name || '')) b.expandByObject(m, true)
  })
  return b
}

// Triangles move into a region's own mesh only when all three corners lie inside that region, so nothing is stretched.
type Region = { test: (x: number, y: number, z: number) => boolean }
function splitRegions(meshes: THREE.Mesh[], regions: Region[], mode: 'all' | 'centroid'): { region: number; geo: THREE.BufferGeometry; src: THREE.Mesh }[] {
  const out: { region: number; geo: THREE.BufferGeometry; src: THREE.Mesh }[] = []
  meshes.forEach((src) => {
    const geo = src.geometry as THREE.BufferGeometry
    const pos = geo.attributes.position as THREE.BufferAttribute
    const nor = geo.attributes.normal as THREE.BufferAttribute | undefined
    const uv = geo.attributes.uv as THREE.BufferAttribute | undefined
    const idx = geo.index
    const triCount = idx ? idx.count / 3 : pos.count / 3
    const vi = (t: number, j: number) => (idx ? idx.getX(t * 3 + j) : t * 3 + j)
    const nmWorld = new THREE.Matrix3().getNormalMatrix(src.matrixWorld)
    const rest = { p: [] as number[], n: [] as number[], uv: [] as number[] }
    const buckets = regions.map(() => ({ p: [] as number[], n: [] as number[], uv: [] as number[] }))
    const N = new THREE.Vector3()
    const push = (b: { p: number[]; n: number[]; uv: number[] }, i: number, q: THREE.Vector3, nm: THREE.Matrix3) => {
      b.p.push(q.x, q.y, q.z)
      if (nor) { N.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); b.n.push(N.x, N.y, N.z) }
      if (uv) b.uv.push(uv.getX(i), uv.getY(i))
    }
    const identity = new THREE.Matrix3()
    let moved = 0
    for (let t = 0; t < triCount; t++) {
      const ids = [vi(t, 0), vi(t, 1), vi(t, 2)]
      const world = ids.map((i) => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(src.matrixWorld))
      let hit = -1
      const cx = (world[0].x + world[1].x + world[2].x) / 3
      const cy = (world[0].y + world[1].y + world[2].y) / 3
      const cz = (world[0].z + world[1].z + world[2].z) / 3
      for (let k = 0; k < regions.length; k++) {
        const inside = mode === 'all' ? world.every((w) => regions[k].test(w.x, w.y, w.z)) : regions[k].test(cx, cy, cz)
        if (inside) { hit = k; break }
      }
      if (hit >= 0) {
        moved++
        ids.forEach((i, j) => push(buckets[hit], i, world[j], nmWorld))
      } else {
        ids.forEach((i) => push(rest, i, new THREE.Vector3().fromBufferAttribute(pos, i), identity))
      }
    }
    if (!moved) return
    const restGeo = new THREE.BufferGeometry()
    restGeo.setAttribute('position', new THREE.Float32BufferAttribute(rest.p, 3))
    if (rest.n.length) restGeo.setAttribute('normal', new THREE.Float32BufferAttribute(rest.n, 3))
    if (rest.uv.length) restGeo.setAttribute('uv', new THREE.Float32BufferAttribute(rest.uv, 2))
    src.geometry = restGeo
    buckets.forEach((b, k) => {
      if (!b.p.length) return
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3))
      if (b.n.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3))
      if (b.uv.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2))
      out.push({ region: k, geo: g, src })
    })
  })
  return out
}

// Each wheel is a cylinder around its hub (axle along Z). Triangles whose corners fall inside a wheel cylinder
// move into a per-wheel mesh that pivots on the hub, so tyre, rim, hub and calliper turn together.
function splitWheelParts(src: THREE.Mesh, seeds: THREE.Vector3[], R: number, halfW: number): THREE.Mesh[] {
  const hits = splitRegions([src], seeds.map((s) => ({
    test: (x: number, y: number, z: number) => Math.abs(z - s.z) < halfW && Math.hypot(x - s.x, y - s.y) < R * 1.02,
  })), 'centroid')
  return hits.map(({ region, geo }) => {
    const s = seeds[region]
    geo.translate(-s.x, -s.y, -s.z)
    const m = new THREE.Mesh(geo, src.material)
    m.position.copy(s)
    m.castShadow = true
    m.receiveShadow = true
    return m
  })
}

export default function TypeR() {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const labelRefs = useRef<(HTMLButtonElement | null)[]>([])
  const actions = useRef<{
    fly: (i: number) => void
    back: () => void
    free: () => void
    doors: () => void
    paint: (i: number) => void
  } | null>(null)
  const [ready, setReady] = useState(false)
  const [paint, setPaint] = useState(0)
  const [mode, setModeUI] = useState<Mode>('scroll')
  const [focus, setFocus] = useState<string | null>(null)
  const [doorsOpen, setDoorsOpen] = useState(false)

  useEffect(() => {
    const el = root.current!
    const cv = canvas.current!
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#05070d')
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.55

    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200)

    const key = new THREE.DirectionalLight('#ffffff', 2.2)
    key.position.set(4, 6, 5)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.left = -4
    key.shadow.camera.right = 4
    key.shadow.camera.top = 4
    key.shadow.camera.bottom = -4
    key.shadow.bias = -0.0005
    scene.add(key)
    const rim = new THREE.DirectionalLight('#ff3340', 3.0)
    rim.position.set(-6, 3, -5)
    scene.add(rim)
    const fill = new THREE.DirectionalLight('#5aa8ff', 0.8)
    fill.position.set(-4, 2, 6)
    scene.add(fill)

    // Floor: a shadow catcher, plus a soft red glow under the car.
    const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 64), new THREE.ShadowMaterial({ opacity: 0.55 }))
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)
    const glowCanvas = document.createElement('canvas')
    glowCanvas.width = glowCanvas.height = 256
    const gctx = glowCanvas.getContext('2d')!
    const grad = gctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    grad.addColorStop(0, 'rgba(255,50,64,0.55)')
    grad.addColorStop(0.5, 'rgba(255,50,64,0.12)')
    grad.addColorStop(1, 'rgba(255,50,64,0)')
    gctx.fillStyle = grad
    gctx.fillRect(0, 0, 256, 256)
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    )
    glow.rotation.x = -Math.PI / 2
    glow.position.y = 0.002
    scene.add(glow)

    // The car rig: position, turn and paint all live here. It stays at the origin while the model loads.
    const rig = new THREE.Group()
    scene.add(rig)
    const cabinLight = new THREE.PointLight('#ffe9d6', 0, 7, 1.6)
    cabinLight.position.copy(CABIN).add(new THREE.Vector3(0, 0.1, 0))
    rig.add(cabinLight)

    let bodyMat: THREE.MeshStandardMaterial | null = null
    const wheels: THREE.Mesh[] = []
    const doorPivots: { pivot: THREE.Group; sign: number; open: number }[] = []
    const doorMats: THREE.MeshStandardMaterial[] = []
    const rigInv = new THREE.Matrix4()
    const doorU = {
      uDoorOpen: { value: 0 },
      uDoorMin: { value: new THREE.Vector3() },
      uDoorMax: { value: new THREE.Vector3() },
      uRigInv: { value: rigInv },
    }
    const anchorBox = new THREE.Box3()
    let loaded = false
    let paintFn: (i: number) => void = () => {}

    // Scroll-driven state. The timeline writes into this; the frame loop reads it.
    const state = {
      carX: -7, carRotY: 0, spin: 0, door: 0,
      camX: 0.4, camY: 1.3, camZ: 9.5, lookX: 0, lookY: 1.5, lookZ: 0,
      inside: 0, yaw: 0, pitch: 0, pointerX: 0, pointerY: 0,
    }

    let mode: Mode = 'scroll'
    const setMode = (m: Mode) => { mode = m; setModeUI(m) }

    // Smooth hand-over: when the camera changes owner, it blends from the last pose instead of cutting.
    const blend = { t: 1 }
    const blendFrom = { pos: new THREE.Vector3(), look: new THREE.Vector3() }
    const lastPose = { pos: new THREE.Vector3(), look: new THREE.Vector3() }
    const beginBlend = () => {
      blendFrom.pos.copy(lastPose.pos)
      blendFrom.look.copy(lastPose.look)
      blend.t = 0
      gsap.to(blend, { t: 1, duration: 0.9, ease: 'power2.inOut' })
    }

    const resize = () => {
      const w = cv.clientWidth
      const h = cv.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(cv)

    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    loader.load(MODEL_URL, (gltf) => {
      const model = gltf.scene
      model.updateMatrixWorld(true)

      // Long axis to X, then scale so the body is CAR_LENGTH long.
      const s0 = boundsOf(model, CAR_RE).getSize(new THREE.Vector3())
      if (s0.z > s0.x) model.rotation.y = Math.PI / 2
      model.updateMatrixWorld(true)
      const s1 = boundsOf(model, CAR_RE).getSize(new THREE.Vector3())
      model.scale.setScalar(CAR_LENGTH / Math.max(s1.x, s1.z))
      model.updateMatrixWorld(true)

      // Centre on the body and stand the tyres on the floor.
      const c = boundsOf(model, CAR_RE).getCenter(new THREE.Vector3())
      const tyre0 = boundsOf(model, TYRE_RE)
      model.position.set(-c.x, -tyre0.min.y, -c.z)
      model.updateMatrixWorld(true)

      // Materials, shadows, and which end is the nose (the headlights sit at the front).
      let noseSum = 0
      model.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial
        const name = mat.name || ''
        mesh.castShadow = true
        mesh.receiveShadow = true
        if (/headlight/i.test(name)) noseSum += boundsOf(mesh, /./).getCenter(new THREE.Vector3()).x
        if (/body_white_ext/i.test(name)) bodyMat = mat
      })
      if (noseSum < 0) model.rotation.y += Math.PI
      model.updateMatrixWorld(true)
      rig.add(model)
      rig.updateMatrixWorld(true)

      // Wheels: each wheel's triangles move into a mesh that pivots on its hub, so the whole wheel turns together.
      const tyreBox = boundsOf(model, TYRE_RE)
      const R = (tyreBox.max.y - tyreBox.min.y) / 2
      const hubY = tyreBox.min.y + R
      const xFront = tyreBox.max.x - R
      const xRear = tyreBox.min.x + R
      const zRight = tyreBox.max.z - 0.125
      const zLeft = tyreBox.min.z + 0.125
      const seeds = [
        new THREE.Vector3(xFront, hubY, zRight),
        new THREE.Vector3(xFront, hubY, zLeft),
        new THREE.Vector3(xRear, hubY, zRight),
        new THREE.Vector3(xRear, hubY, zLeft),
      ]
      const allMeshes: THREE.Mesh[] = []
      model.traverse((o) => { if ((o as THREE.Mesh).isMesh) allMeshes.push(o as THREE.Mesh) })
      allMeshes.forEach((m) => {
        splitWheelParts(m, seeds, R, 0.16).forEach((w) => { rig.add(w); wheels.push(w) })
      })

      // Doors: the GLB has no separate door meshes. Each door panel is cut out of the body shell by its outline,
      // then hinged on its front edge. Only triangles fully inside an outline move, so the cut stays clean.
      // Doors: the body stays whole. A box-shaped opening is cut in the body shader while the door is open, and a copy
      // of the door panel swings on its hinge. Nothing is pulled apart, so the car never tears or peels.
      const bb = boundsOf(model, CAR_RE)
      const bc = bb.getCenter(new THREE.Vector3())
      const halfW = bb.max.z - bc.z
      const hingeX = bc.x - 0.05
      const doorMin = new THREE.Vector3(bc.x - 1.15, bb.min.y + 0.36, bc.z + halfW * 0.7)
      const doorMax = new THREE.Vector3(bc.x - 0.05, bb.min.y + 0.82, bc.z + halfW * 1.3)
      doorU.uDoorMin.value.copy(doorMin)
      doorU.uDoorMax.value.copy(doorMax)
      const inDoor = (x: number, y: number, z: number) => x > doorMin.x && x < doorMax.x && y > doorMin.y && y < doorMax.y && z > doorMin.z && z < doorMax.z
      const bodyMeshes: THREE.Mesh[] = []
      model.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.Material
        if (/body_white_ext/i.test(mat.name || '')) bodyMeshes.push(m)
      })

      // Copy the door panel's triangles (the originals stay put).
      const dP: number[] = []
      const dN: number[] = []
      const dU: number[] = []
      const N = new THREE.Vector3()
      bodyMeshes.forEach((src) => {
        const geo = src.geometry as THREE.BufferGeometry
        const pos = geo.attributes.position as THREE.BufferAttribute
        const nor = geo.attributes.normal as THREE.BufferAttribute | undefined
        const uv = geo.attributes.uv as THREE.BufferAttribute | undefined
        const idx = geo.index
        const triCount = idx ? idx.count / 3 : pos.count / 3
        const nm = new THREE.Matrix3().getNormalMatrix(src.matrixWorld)
        for (let t = 0; t < triCount; t++) {
          const ids = [0, 1, 2].map((j) => (idx ? idx.getX(t * 3 + j) : t * 3 + j))
          const world = ids.map((i) => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(src.matrixWorld))
          // Any triangle touching the door box is copied; the copy is clipped to the box in its own shader.
          const touches = world.some((w) => inDoor(w.x, w.y, w.z))
          if (!touches) continue
          ids.forEach((i, j) => {
            dP.push(world[j].x, world[j].y, world[j].z)
            if (nor) { N.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); dN.push(N.x, N.y, N.z) }
            if (uv) dU.push(uv.getX(i), uv.getY(i))
          })
        }
      })
      const pivotPos = new THREE.Vector3(hingeX, 0, bc.z + halfW * 0.92)
      const doorGeo = new THREE.BufferGeometry()
      doorGeo.setAttribute('position', new THREE.Float32BufferAttribute(dP, 3))
      if (dN.length) doorGeo.setAttribute('normal', new THREE.Float32BufferAttribute(dN, 3))
      if (dU.length) doorGeo.setAttribute('uv', new THREE.Float32BufferAttribute(dU, 2))
      doorGeo.translate(-pivotPos.x, -pivotPos.y, -pivotPos.z)
      const doorPivot = new THREE.Group()
      doorPivot.position.copy(pivotPos)
      doorPivot.visible = false
      if (dP.length) {
        const doorMat = (bodyMat as THREE.MeshStandardMaterial).clone()
        doorMat.onBeforeCompile = (sh) => {
          Object.assign(sh.uniforms, doorU, { uPivot: { value: pivotPos } })
          sh.vertexShader = sh.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;\nuniform vec3 uPivot;')
            .replace('#include <project_vertex>', '#include <project_vertex>\nvLocal = position + uPivot;')
          sh.fragmentShader = sh.fragmentShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;\nuniform vec3 uDoorMin;\nuniform vec3 uDoorMax;')
            .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (any(lessThan(vLocal, uDoorMin)) || any(greaterThan(vLocal, uDoorMax))) discard;')
        }
        doorMat.customProgramCacheKey = () => 'door-clip'
        doorMats.push(doorMat)
        const doorMesh = new THREE.Mesh(doorGeo, doorMat)
        doorMesh.castShadow = true
        doorMesh.receiveShadow = true
        doorPivot.add(doorMesh)
      }
      rig.add(doorPivot)
      doorPivots.push({ pivot: doorPivot, sign: 1, open: 0.95 })

      // The body shader drops fragments inside the door box while the door is open. Rig-local space keeps the hole on the car.
      if (bodyMat) {
        const body = bodyMat as THREE.MeshStandardMaterial
        body.onBeforeCompile = (sh) => {
          Object.assign(sh.uniforms, doorU)
          sh.vertexShader = sh.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vRigPos;\nuniform mat4 uRigInv;')
            .replace('#include <project_vertex>', '#include <project_vertex>\nvRigPos = (uRigInv * modelMatrix * vec4(transformed, 1.0)).xyz;')
          sh.fragmentShader = sh.fragmentShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vRigPos;\nuniform float uDoorOpen;\nuniform vec3 uDoorMin;\nuniform vec3 uDoorMax;')
            .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (uDoorOpen > 0.01 && all(greaterThan(vRigPos, uDoorMin)) && all(lessThan(vRigPos, uDoorMax))) discard;')
        }
        body.customProgramCacheKey = () => 'body-door-hole'
      }

      // Hotspot boxes are measured here, while the rig is still at the origin.
      anchorBox.copy(boundsOf(model, CAR_RE))

      paintFn = (i: number) => {
        if (!bodyMat) return
        const col = new THREE.Color(PAINTS[i].hex)
        gsap.to(bodyMat.color, { r: col.r, g: col.g, b: col.b, duration: 0.9, ease: 'power2.out' })
        doorMats.forEach((m) => gsap.to(m.color, { r: col.r, g: col.g, b: col.b, duration: 0.9, ease: 'power2.out' }))
      }
      loaded = true
      setReady(true)
    })

    // The journey, scrubbed by scroll:
    // roll in, side pass, slide to the rear door, step through it into the cabin, look around, step back out through the same door, finale.
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } })
    tl.to(state, { carX: 0, spin: 1, duration: 0.2, ease: 'power3.out' }, 0)
      .to(state, { spin: 0, duration: 0.05 }, 0.2)
      .to(state, { camX: -2.4, camY: 1.3, camZ: 4.6, lookX: 0, lookY: 1.1, lookZ: 0, duration: 0.16 }, 0.2)
      .to(state, { door: 1, duration: 0.08, ease: 'power2.inOut' }, 0.36)
      .to(state, { camX: DOOR_OUT.x, camY: DOOR_OUT.y, camZ: DOOR_OUT.z, lookX: -0.3, lookY: 1.0, lookZ: 0, duration: 0.08 }, 0.42)
      .to(state, { camX: DOOR_IN.x, camY: DOOR_IN.y, camZ: DOOR_IN.z, lookX: 0.6, lookY: 1.0, lookZ: 0, duration: 0.08 }, 0.5)
      .to(state, { camX: CABIN.x, camY: CABIN.y, camZ: CABIN.z, duration: 0.06 }, 0.56)
      .set(state, { inside: 1, yaw: 0.26, pitch: 0 }, 0.56)
      .set(state, { inside: 0 }, 0.8)
      .to(state, { camX: DOOR_IN.x, camY: DOOR_IN.y, camZ: DOOR_IN.z, duration: 0.06 }, 0.8)
      .to(state, { camX: DOOR_OUT.x, camY: DOOR_OUT.y, camZ: DOOR_OUT.z, lookX: -0.3, lookY: 1.0, lookZ: 0, duration: 0.07 }, 0.86)
      .to(state, { door: 0, duration: 0.08, ease: 'power2.inOut' }, 0.88)
      .to(state, { camX: 0, camY: 1.2, camZ: 9.5, lookX: 0, lookY: 1.9, lookZ: 0, carRotY: Math.PI / 4, duration: 0.12 }, 0.92)
      .to(state, { spin: 0.35, duration: 0.05 }, 0.92)
      .to(state, { spin: 0, duration: 0.05 }, 0.98)
    const trigger = ScrollTrigger.create({ trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.6, animation: tl })

    const onPointer = (e: PointerEvent) => {
      state.pointerX = e.clientX / window.innerWidth - 0.5
      state.pointerY = e.clientY / window.innerHeight - 0.5
    }
    window.addEventListener('pointermove', onPointer, { passive: true })

    // Look around inside the cabin: drag to turn the head. Only active while seated.
    let dragging = false
    let lastX = 0
    let lastY = 0
    const inCabin = () => mode === 'cabin' || (mode === 'scroll' && state.inside > 0.5)
    const onDown = (e: PointerEvent) => { if (inCabin()) { dragging = true; lastX = e.clientX; lastY = e.clientY } }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      state.yaw = THREE.MathUtils.clamp(state.yaw - (e.clientX - lastX) * 0.005, -1.4, 1.4)
      state.pitch = THREE.MathUtils.clamp(state.pitch - (e.clientY - lastY) * 0.004, -0.5, 0.5)
      lastX = e.clientX
      lastY = e.clientY
    }
    const onUp = () => { dragging = false }
    cv.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)

    // Free roam: orbit, zoom, no pan. Only active when the viewer takes over the camera.
    const controls = new OrbitControls(camera, cv)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.minDistance = 2.2
    controls.maxDistance = 16
    controls.maxPolarAngle = Math.PI * 0.49
    controls.target.copy(TARGET)
    controls.enabled = false

    const v = new THREE.Vector3()
    const ctr = new THREE.Vector3()
    const sz = new THREE.Vector3()
    const anchorWorld = (spot: (typeof SPOTS)[number], out: THREE.Vector3) => {
      anchorBox.getCenter(ctr)
      anchorBox.getSize(sz)
      out.set(ctr.x + spot.fx * sz.x, anchorBox.min.y + spot.fy * sz.y, ctr.z + spot.fz * sz.z)
      return out.applyMatrix4(rig.matrixWorld)
    }

    // Fly: glide to a hotspot. The target is recomputed each frame, so it stays on the car.
    let flyTween: gsap.core.Tween | null = null
    const flyView = { pos: new THREE.Vector3(), look: new THREE.Vector3() }
    const fly = (i: number) => {
      const spot = SPOTS[i]
      if (!spot || !loaded) return
      flyTween?.kill()
      controls.enabled = false
      setFocus(spot.id)
      setMode('fly')
      const start = camera.position.clone()
      const startLook = controls.target.clone()
      const p = { t: 0 }
      const target = new THREE.Vector3()
      const end = new THREE.Vector3()
      const doorPt = DOOR_IN.clone().applyMatrix4(rig.matrixWorld)
      const cabinPt = CABIN.clone().applyMatrix4(rig.matrixWorld)
      const cabinLook = new THREE.Vector3(CABIN.x + 2, CABIN.y - 0.05, CABIN.z).applyMatrix4(rig.matrixWorld)
      flyTween = gsap.to(p, {
        t: 1, duration: spot.cabin ? 2.6 : 1.8, ease: 'power3.inOut',
        onUpdate: () => {
          if (spot.cabin) {
            // Cabin: through the open rear door, then seated.
            flyView.pos.copy(p.t < 0.5 ? start.clone().lerp(doorPt, p.t * 2) : doorPt.clone().lerp(cabinPt, (p.t - 0.5) * 2))
            flyView.look.lerpVectors(startLook, cabinLook, p.t)
          } else {
            anchorWorld(spot, target)
            end.copy(target).add(new THREE.Vector3(1.4, 0.9, 4.4))
            flyView.pos.lerpVectors(start, end, p.t)
            flyView.look.lerpVectors(startLook, target, p.t)
          }
        },
        onComplete: () => {
          if (spot.cabin) {
            state.yaw = 0.26
            state.pitch = 0
            setMode('cabin')
          } else {
            controls.target.copy(target)
            camera.position.copy(flyView.pos)
            controls.update()
            controls.enabled = true
            setMode('free')
          }
        },
      })
      // The cabin entry also opens the rear door.
      if (spot.cabin) gsap.to(state, { door: 1, duration: 0.8, ease: 'power2.inOut' })
    }

    // Back to the journey: blend back to the scroll pose at the current scroll position.
    const back = () => {
      flyTween?.kill()
      controls.enabled = false
      setFocus(null)
      beginBlend()
      setMode('scroll')
      tl.progress(tl.progress())
    }

    // Free roam from wherever the camera is now.
    const free = () => {
      flyTween?.kill()
      setFocus(null)
      controls.target.copy(TARGET)
      camera.position.copy(lastPose.pos)
      controls.update()
      controls.enabled = true
      setMode('free')
    }

    const doors = () => {
      const open = state.door < 0.5
      gsap.to(state, { door: open ? 1 : 0, duration: 0.9, ease: 'power2.inOut' })
      setDoorsOpen(open)
    }

    actions.current = { fly, back, free, doors, paint: (i: number) => paintFn(i) }

    // Callout labels: always visible, always clickable. Pushed apart vertically when they would overlap.
    const placed: { node: HTMLButtonElement; x: number; y: number; w: number; h: number; side: 'left' | 'right' }[] = []
    const placeLabels = () => {
      const W = cv.clientWidth
      const H = cv.clientHeight
      placed.length = 0
      SPOTS.forEach((spot, i) => {
        const node = labelRefs.current[i]
        if (!node) return
        anchorWorld(spot, v).project(camera)
        if (v.z > 1) { node.style.opacity = '0'; node.style.pointerEvents = 'none'; return }
        node.style.opacity = '1'
        node.style.pointerEvents = 'auto'
        const w = node.offsetWidth
        const h = node.offsetHeight
        const x = (v.x * 0.5 + 0.5) * W
        const y = (-v.y * 0.5 + 0.5) * H
        const s = x - w < 12 ? 'right' : x + w > W - 12 ? 'left' : spot.side
        placed.push({ node, x, y, w, h, side: s })
      })
      placed.sort((a, b) => a.y - b.y)
      for (let k = 1; k < placed.length; k++) {
        const p = placed[k - 1]
        const q = placed[k]
        const minY = p.y + p.h / 2 + 8 + q.h / 2
        if (q.y < minY) q.y = minY
      }
      placed.forEach((p) => {
        const edge = Math.min(Math.max(p.side === 'left' ? p.x - p.w : p.x, 12), W - 12 - p.w)
        const lx = p.side === 'left' ? edge + p.w : edge
        const ly = Math.min(Math.max(p.y, 12 + p.h / 2), H - 12 - p.h / 2)
        p.node.style.flexDirection = p.side === 'left' ? 'row-reverse' : 'row'
        p.node.style.transform = `translate(${lx}px, ${ly}px) translate(${p.side === 'left' ? '-100%' : '0'}, -50%)`
      })
    }

    let last = performance.now()
    let raf = 0
    let visible = true
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting }, { threshold: 0 })
    io.observe(el)

    const dir = new THREE.Vector3()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!visible || !loaded) return

      rig.position.x = state.carX
      rig.rotation.y = state.carRotY
      rig.updateMatrixWorld(true)
      key.position.x = 4 + state.pointerX * 2
      cabinLight.intensity = (mode === 'cabin' || state.inside > 0.5) ? 10 : 0
      doorPivots.forEach((d) => { d.pivot.rotation.y = d.sign * d.open * state.door; d.pivot.visible = state.door > 0.001 })
      doorU.uDoorOpen.value = state.door
      rigInv.copy(rig.matrixWorld).invert()
      wheels.forEach((w) => { w.rotation.z -= dt * state.spin * 14 })

      // Pick the camera pose for the current owner.
      const pos = new THREE.Vector3()
      const look = new THREE.Vector3()
      const seated = mode === 'cabin' || (mode === 'scroll' && state.inside > 0.5)
      if (mode === 'scroll' || mode === 'cabin') {
        if (seated) {
          pos.copy(CABIN)
          dir.set(Math.cos(state.pitch) * Math.cos(state.yaw), Math.sin(state.pitch), -Math.cos(state.pitch) * Math.sin(state.yaw))
          look.copy(pos).add(dir)
        } else {
          const hHalfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect
          const fitDist = (CAR_LENGTH * 0.62) / hHalfTan
          const extra = Math.max(0, fitDist - 9.5)
          pos.set(state.camX, state.camY - state.pointerY * 0.25, state.camZ * (1 + extra / 9.5) + state.pointerX * 0.4)
          look.set(state.lookX, state.lookY, state.lookZ)
        }
        if (blend.t < 1) {
          pos.lerpVectors(blendFrom.pos, pos, blend.t)
          look.lerpVectors(blendFrom.look, look, blend.t)
        }
        camera.position.copy(pos)
        camera.lookAt(look)
      } else if (mode === 'fly') {
        camera.position.copy(flyView.pos)
        camera.lookAt(flyView.look)
      } else {
        controls.update()
      }
      if (mode !== 'free') { lastPose.pos.copy(camera.position); camera.getWorldDirection(dir); lastPose.look.copy(camera.position).add(dir) }

      placeLabels()
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      cv.removeEventListener('pointerdown', onDown)
      trigger.kill()
      tl.kill()
      flyTween?.kill()
      controls.dispose()
      renderer.dispose()
      pmrem.dispose()
    }
  }, [])

  useEffect(() => {
    actions.current?.paint(paint)
  }, [paint, ready])

  const current = SPOTS.find((s) => s.id === focus)
  const roaming = mode === 'free'
  const cabinMode = mode === 'cabin'

  return (
    <section ref={root} className="relative h-[520vh] w-full bg-[#05070d]" aria-label="Civic Type-R">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_70%,rgba(200,16,46,0.22),transparent_60%)]" />
        <canvas ref={canvas} className={`absolute inset-0 h-full w-full touch-none ${cabinMode ? 'cursor-grab active:cursor-grabbing' : ''}`} />

        <h2 className="pointer-events-none absolute left-1/2 top-[7vh] -translate-x-1/2 whitespace-nowrap text-center font-black uppercase leading-none tracking-[0.02em] text-white" style={{ fontSize: 'clamp(40px, 8vw, 150px)' }}>
          <TwistText text="Civic Type-R" />
        </h2>
        <p className="pointer-events-none absolute left-1/2 top-[calc(7vh+clamp(40px,8vw,150px)+1.5vh)] -translate-x-1/2 whitespace-nowrap text-center font-light tracking-[0.35em] text-[#ff3340]" style={{ fontSize: 'clamp(10px, 1vw, 16px)' }}>
          TRACK-BRED · ROAD-LEGAL
        </p>

        {SPOTS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            ref={(n) => { labelRefs.current[i] = n }}
            onClick={() => actions.current?.fly(i)}
            aria-label={s.label}
            className="absolute left-0 top-0 flex cursor-pointer items-center gap-2 opacity-0 will-change-transform focus:outline-none"
          >
            <span className="block h-px w-[clamp(30px,5vw,90px)] bg-gradient-to-r from-[#ff3340] to-transparent" />
            <span
              className={`rounded-sm border px-3 py-1.5 font-semibold tracking-[0.18em] text-white backdrop-blur transition-colors ${focus === s.id ? 'border-[#ff3340] bg-[#3a0d14]/80' : 'border-white/20 bg-black/55 hover:border-[#ff3340]'}`}
              style={{ fontSize: 'clamp(10px, 1vw, 15px)' }}
            >
              {s.label}
            </span>
          </button>
        ))}

        {current && (
          <div className="absolute bottom-[12vh] left-[4vw] max-w-[min(340px,86vw)] rounded-md border border-white/15 bg-black/70 p-5 backdrop-blur">
            <p className="text-[10px] font-semibold tracking-[0.3em] text-[#ff3340]">HOTSPOT</p>
            <h3 className="mt-2 text-xl font-bold text-white">{current.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">{current.text}</p>
            <button type="button" onClick={() => actions.current?.back()} className="mt-4 rounded-sm border border-white/30 px-3 py-1.5 text-xs font-semibold tracking-[0.2em] text-white hover:border-[#ff3340] hover:text-[#ff3340]">
              BACK TO JOURNEY
            </button>
          </div>
        )}

        <div className="absolute right-[4vw] top-[calc(7vh+clamp(40px,8vw,150px)+7vh)] flex flex-col items-end gap-3">
          <button type="button" onClick={() => actions.current?.doors()} className="rounded-sm border border-white/30 bg-black/50 px-3 py-1.5 text-xs font-semibold tracking-[0.2em] text-white backdrop-blur hover:border-[#ff3340] hover:text-[#ff3340]">
            {doorsOpen ? 'CLOSE DOORS' : 'OPEN DOORS'}
          </button>
          {roaming || cabinMode || mode === 'fly' ? (
            <button type="button" onClick={() => actions.current?.back()} className="rounded-sm border border-white/30 bg-black/50 px-3 py-1.5 text-xs font-semibold tracking-[0.2em] text-white backdrop-blur hover:border-[#ff3340] hover:text-[#ff3340]">
              BACK TO JOURNEY
            </button>
          ) : (
            <button type="button" onClick={() => actions.current?.free()} className="rounded-sm border border-white/30 bg-black/50 px-3 py-1.5 text-xs font-semibold tracking-[0.2em] text-white backdrop-blur hover:border-[#ff3340] hover:text-[#ff3340]">
              FREE ROAM
            </button>
          )}
        </div>

        <div className="absolute bottom-[7vh] left-1/2 flex -translate-x-1/2 items-center gap-4">
          {PAINTS.map((p, i) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setPaint(i)}
              aria-label={p.name}
              title={p.name}
              className={`h-8 w-8 rounded-full border-2 transition-transform duration-300 hover:scale-125 ${paint === i ? 'scale-110 border-white' : 'border-white/30'}`}
              style={{ background: p.hex }}
            />
          ))}
          <span className="ml-2 font-light tracking-[0.2em] text-white/80" style={{ fontSize: 'clamp(10px, 0.9vw, 14px)' }}>{PAINTS[paint].name.toUpperCase()}</span>
        </div>
        <p className="pointer-events-none absolute bottom-[2.5vh] right-[4vw] text-[10px] tracking-[0.25em] text-white/40">
          {roaming ? 'DRAG TO ROAM · SCROLL TO ZOOM' : cabinMode ? 'DRAG TO LOOK AROUND' : 'SCROLL TO DRIVE · CLICK A POINT'}
        </p>
      </div>
    </section>
  )
}
