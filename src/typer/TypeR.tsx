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
const PAINTS = [
  { name: 'Championship White', hex: '#f2f2ef' },
  { name: 'Rally Red', hex: '#c8102e' },
  { name: 'Crystal Black Pearl', hex: '#101216' },
]

// Callouts live in car-local space: x runs nose (+) to tail (-) as a fraction of the car length; y is height above the ground.
const CALLOUTS = [
  { text: '2.0L K20C1 VTEC TURBO', x: 0.3, y: 0.62, z: 0.0, side: 'left' as const },
  { text: '420 Nm OF TORQUE', x: -0.3, y: 0.5, z: 0.92, side: 'right' as const },
  { text: '6-SPEED MANUAL', x: 0.0, y: 1.02, z: 0.1, side: 'left' as const },
  { text: 'MECHANICAL LIMITED-SLIP DIFF', x: -0.34, y: 0.32, z: -0.92, side: 'right' as const },
]

const CABIN_FOCUS = { x: 0.05, y: 0.95, z: -0.35 }

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
    let bodyMat: THREE.MeshStandardMaterial | null = null
    let loaded = false

    const state = {
      carX: -7, carRotY: 0, spin: 0,
      camX: 0, camY: 1.3, camZ: 9.5, lookX: 0, lookY: 1.5, lookZ: 0,
      inside: 0, pointerX: 0, pointerY: 0,
    }

    // Keep the canvas matched to its section size.
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
      // Long axis to X, scale to CAR_LENGTH, then stand the car on the floor centred on the origin.
      const size0 = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
      if (size0.z > size0.x) model.rotation.y = Math.PI / 2
      model.updateMatrixWorld(true)
      const size1 = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
      model.scale.setScalar(CAR_LENGTH / Math.max(size1.x, size1.z))
      model.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(model)
      const c = box.getCenter(new THREE.Vector3())
      model.position.set(-c.x, -box.min.y, -c.z)
      model.updateMatrixWorld(true)

      // The headlights sit at the nose: point +X at the front.
      let noseSum = 0
      model.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial
        const name = mat.name || ''
        mesh.castShadow = true
        mesh.receiveShadow = true
        if (/headlight/i.test(name)) noseSum += new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()).x
        if (/body_white_ext/i.test(name)) bodyMat = mat
      })
      if (noseSum < 0) model.rotation.y += Math.PI
      model.updateMatrixWorld(true)
      rig.add(model)
      rig.updateMatrixWorld(true)

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
      .to(state, { carRotY: Math.PI / 2, camX: 1.2, camY: 1.1, camZ: 4.6, lookY: 1.4, duration: 0.25 }, 0.25)
      .to(state, { inside: 1, camX: CABIN_FOCUS.x, camY: CABIN_FOCUS.y, camZ: CABIN_FOCUS.z, lookX: CABIN_FOCUS.x + 2, lookY: CABIN_FOCUS.y - 0.05, lookZ: CABIN_FOCUS.z, duration: 0.25 }, 0.5)
      .to(state, { inside: 0, camX: 0, camY: 1.2, camZ: 9.5, lookX: 0, lookY: 1.9, lookZ: 0, carRotY: Math.PI / 4, spin: 0.35, duration: 0.3 }, 0.72)
    labelRefs.current.forEach((node, i) => {
      if (!node) return
      tl.fromTo(node, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.05 }, 0.3 + i * 0.04)
      tl.to(node, { autoAlpha: 0, duration: 0.04 }, 0.5 + i * 0.01)
    })
    const trigger = ScrollTrigger.create({ trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.6, animation: tl })

    // Pointer: the car and camera drift with the mouse for depth.
    const onPointer = (e: PointerEvent) => {
      state.pointerX = e.clientX / window.innerWidth - 0.5
      state.pointerY = e.clientY / window.innerHeight - 0.5
    }
    window.addEventListener('pointermove', onPointer, { passive: true })


    // Callout labels follow their 3D anchor points.
    const v = new THREE.Vector3()
    const project = () => {
      CALLOUTS.forEach((c, i) => {
        const node = labelRefs.current[i]
        if (!node) return
        v.set(c.x * CAR_LENGTH * 0.5, c.y, c.z).applyMatrix4(rig.matrixWorld).project(camera)
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
