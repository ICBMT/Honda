import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import TwistText from '../lib/TwistText'

const MODEL_URL = '/models/civic-type-r.glb'
const CAR_LENGTH = 4.6
const CAR_RE = /body_white_ext|tire|tyre|headlight/i
const TYRE_RE = /tire|tyre/i
const PAINTS = [
  { name: 'Championship White', hex: '#f2f2ef' },
  { name: 'Rally Red', hex: '#c8102e' },
  { name: 'Crystal Black Pearl', hex: '#101216' },
]

// Anchors are fractions of the car's measured body box (height 0..1, length and width -0.5..0.5), so they follow the car.
const CALLOUTS = [
  { text: '2.0L K20C1 VTEC TURBO', fx: 0.3, fy: 0.45, fz: 0.0, side: 'left' as const },
  { text: '420 Nm OF TORQUE', fx: -0.3, fy: 0.3, fz: 0.45, side: 'right' as const },
  { text: '6-SPEED MANUAL', fx: 0.0, fy: 0.72, fz: 0.1, side: 'left' as const },
  { text: 'MECHANICAL LIMITED-SLIP DIFF', fx: -0.34, fy: 0.2, fz: -0.45, side: 'right' as const },
]

const CABIN_FOCUS = { x: 0.05, y: 0.95, z: -0.35 }

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

// The model keeps all four tyres in one mesh per material. Split a tyre mesh into one mesh per wheel,
// so each wheel can roll about its own axle.
function splitWheels(src: THREE.Mesh, seeds: THREE.Vector3[]): THREE.Mesh[] {
  const geo = src.geometry as THREE.BufferGeometry
  const pos = geo.attributes.position as THREE.BufferAttribute
  const nor = geo.attributes.normal as THREE.BufferAttribute | undefined
  const uv = geo.attributes.uv as THREE.BufferAttribute | undefined
  const idx = geo.index
  const triCount = idx ? idx.count / 3 : pos.count / 3
  const nm = new THREE.Matrix3().getNormalMatrix(src.matrixWorld)
  const buckets = seeds.map(() => ({ p: [] as number[], n: [] as number[], uv: [] as number[] }))
  const vi = (t: number, j: number) => (idx ? idx.getX(t * 3 + j) : t * 3 + j)
  const N = new THREE.Vector3()
  for (let t = 0; t < triCount; t++) {
    const ids = [vi(t, 0), vi(t, 1), vi(t, 2)]
    const pts = ids.map((i) => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(src.matrixWorld))
    const cx = (pts[0].x + pts[1].x + pts[2].x) / 3
    const cz = (pts[0].z + pts[1].z + pts[2].z) / 3
    let best = 0
    let bestD = Infinity
    seeds.forEach((s, k) => {
      const d = (s.x - cx) ** 2 + (s.z - cz) ** 2
      if (d < bestD) { bestD = d; best = k }
    })
    const b = buckets[best]
    ids.forEach((i, j) => {
      const q = pts[j]
      b.p.push(q.x, q.y, q.z)
      if (nor) {
        N.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize()
        b.n.push(N.x, N.y, N.z)
      }
      if (uv) b.uv.push(uv.getX(i), uv.getY(i))
    })
  }
  const out: THREE.Mesh[] = []
  buckets.forEach((b, k) => {
    if (!b.p.length) return
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3))
    if (b.n.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3))
    if (b.uv.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2))
    // Pivot each wheel on its hub so it spins in place.
    g.translate(-seeds[k].x, -seeds[k].y, -seeds[k].z)
    const m = new THREE.Mesh(g, src.material)
    m.position.copy(seeds[k])
    m.castShadow = true
    m.receiveShadow = true
    out.push(m)
  })
  return out
}

export default function TypeR() {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const labelRefs = useRef<(HTMLDivElement | null)[]>([])
  const [ready, setReady] = useState(false)
  const [paint, setPaint] = useState(0)
  const paintFn = useRef<((i: number) => void) | null>(null)

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

    // Lights: a soft key from the front, a red rim from behind, a cool fill.
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

    // Floor: a shadow catcher plus a soft red glow under the car.
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

    // The car rig: position, turn and paint of the car all live here.
    const rig = new THREE.Group()
    scene.add(rig)
    // A warm light inside the cabin, so the interior reads during the cabin shot.
    const cabinLight = new THREE.PointLight('#ffe9d6', 0, 7, 1.6)
    cabinLight.position.set(CABIN_FOCUS.x, 1.05, 0)
    rig.add(cabinLight)

    let bodyMat: THREE.MeshStandardMaterial | null = null
    const wheels: THREE.Mesh[] = []
    const anchorBox = new THREE.Box3()
    let loaded = false

    const state = {
      carX: -7, carRotY: 0, spin: 0,
      camX: 0, camY: 1.3, camZ: 9.5, lookX: 0, lookY: 1.5, lookZ: 0,
      inside: 0, pointerX: 0, pointerY: 0,
    }

    // Keep the canvas matched to its visible size.
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

      // Wheels: split the tyre meshes into four wheels, each pivoting on its hub.
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
      const tyreMeshes: THREE.Mesh[] = []
      model.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh && TYRE_RE.test((Array.isArray(m.material) ? m.material[0] : m.material).name || '')) tyreMeshes.push(m)
      })
      tyreMeshes.forEach((m) => {
        splitWheels(m, seeds).forEach((w) => { rig.add(w); wheels.push(w) })
        m.visible = false
      })

      anchorBox.copy(boundsOf(model, CAR_RE))

      paintFn.current = (i: number) => {
        if (!bodyMat) return
        const col = new THREE.Color(PAINTS[i].hex)
        gsap.to(bodyMat.color, { r: col.r, g: col.g, b: col.b, duration: 0.9, ease: 'power2.out' })
      }
      loaded = true
      setReady(true)
    })

    // Scroll director: one timeline, scrubbed by the section's scroll progress.
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } })
    tl.to(state, { carX: 0, spin: 1, camX: 0.4, duration: 0.22, ease: 'power3.out' }, 0)
      .to(state, { spin: 0, duration: 0.05 }, 0.2)
      .to(state, { carRotY: Math.PI / 2, camX: 1.6, camY: 1.3, camZ: 8.2, lookY: 1.4, duration: 0.25 }, 0.25)
      .to(state, { inside: 1, camX: CABIN_FOCUS.x, camY: CABIN_FOCUS.y, camZ: CABIN_FOCUS.z, lookX: CABIN_FOCUS.x + 2, lookY: CABIN_FOCUS.y - 0.05, lookZ: CABIN_FOCUS.z, duration: 0.25 }, 0.5)
      .to(state, { inside: 0, camX: 0, camY: 1.2, camZ: 9.5, lookX: 0, lookY: 1.9, lookZ: 0, carRotY: Math.PI / 4, spin: 0.35, duration: 0.3 }, 0.72)
    labelRefs.current.forEach((node, i) => {
      if (!node) return
      tl.fromTo(node, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.05 }, 0.3 + i * 0.04)
      tl.to(node, { autoAlpha: 0, duration: 0.04 }, 0.5 + i * 0.01)
    })
    const trigger = ScrollTrigger.create({ trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.6, animation: tl })

    // Pointer: the camera drifts with the mouse for depth.
    const onPointer = (e: PointerEvent) => {
      state.pointerX = e.clientX / window.innerWidth - 0.5
      state.pointerY = e.clientY / window.innerHeight - 0.5
    }
    window.addEventListener('pointermove', onPointer, { passive: true })

    // Callout labels follow their 3D anchor points on the car.
    const v = new THREE.Vector3()
    const ctrV = new THREE.Vector3()
    const sizeV = new THREE.Vector3()
    const project = () => {
      if (!anchorBox.isEmpty()) {
        anchorBox.getCenter(ctrV)
        anchorBox.getSize(sizeV)
      }
      CALLOUTS.forEach((c, i) => {
        const node = labelRefs.current[i]
        if (!node) return
        v.set(ctrV.x + c.fx * sizeV.x, anchorBox.min.y + c.fy * sizeV.y, ctrV.z + c.fz * sizeV.z).applyMatrix4(rig.matrixWorld).project(camera)
        const x = (v.x * 0.5 + 0.5) * cv.clientWidth
        const y = (-v.y * 0.5 + 0.5) * cv.clientHeight
        node.style.transform = `translate(${x}px, ${y}px) translate(${c.side === 'left' ? '-100%' : '0'}, -50%)`
      })
    }

    let last = performance.now()
    let raf = 0
    let visible = true
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting }, { threshold: 0 })
    io.observe(el)

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!visible || !loaded) return

      // Framing: back the camera off on narrow screens so the whole car fits any aspect ratio.
      const hHalfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect
      const fitDist = (CAR_LENGTH * 0.62) / hHalfTan
      const extra = Math.max(0, fitDist - 9.5) * (1 - state.inside)
      camera.position.set(state.camX, state.camY - state.pointerY * 0.25, state.camZ * (1 + extra / 9.5) + state.pointerX * 0.4)
      camera.lookAt(state.lookX, state.lookY, state.lookZ)

      rig.position.x = state.carX
      rig.rotation.y = state.carRotY
      key.position.x = 4 + state.pointerX * 2
      cabinLight.intensity = state.inside * 14

      // Wheels roll on their axles while the car moves.
      wheels.forEach((w) => { w.rotation.z -= dt * state.spin * 14 })

      project()
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      window.removeEventListener('pointermove', onPointer)
      trigger.kill()
      tl.kill()
      renderer.dispose()
      pmrem.dispose()
    }
  }, [])

  useEffect(() => {
    paintFn.current?.(paint)
  }, [paint, ready])

  return (
    <section ref={root} className="relative h-[520vh] w-full bg-[#05070d]" aria-label="Civic Type-R">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_70%,rgba(200,16,46,0.22),transparent_60%)]" />
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" />

        <h2 className="absolute left-1/2 top-[8vh] -translate-x-1/2 whitespace-nowrap text-center font-black uppercase leading-none tracking-[0.02em] text-white" style={{ fontSize: 'clamp(40px, 8vw, 150px)' }}>
          <TwistText text="Civic Type-R" />
        </h2>
        <p className="absolute left-1/2 top-[calc(8vh+clamp(40px,8vw,150px)+1.5vh)] -translate-x-1/2 whitespace-nowrap text-center font-light tracking-[0.35em] text-[#ff3340]" style={{ fontSize: 'clamp(10px, 1vw, 16px)' }}>
          TRACK-BRED · ROAD-LEGAL
        </p>

        {CALLOUTS.map((c, i) => (
          <div
            key={c.text}
            ref={(n) => { labelRefs.current[i] = n }}
            className="pointer-events-none absolute left-0 top-0 flex items-center gap-2 opacity-0 will-change-transform"
            style={{ flexDirection: c.side === 'left' ? 'row-reverse' : 'row' }}
          >
            <span className="block h-px w-[clamp(30px,5vw,90px)] bg-gradient-to-r from-[#ff3340] to-transparent" />
            <span className="rounded-sm border border-white/20 bg-black/55 px-3 py-1.5 font-semibold tracking-[0.18em] text-white backdrop-blur" style={{ fontSize: 'clamp(10px, 1vw, 15px)' }}>
              {c.text}
            </span>
          </div>
        ))}

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
      </div>
    </section>
  )
}
