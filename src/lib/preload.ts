// Loads everything the site needs before it mounts: the Type-R model (with real progress), the section images, and fonts.
// The model is kept in memory as a blob URL so the Type-R section does not download it a second time.

export const MODEL_URL = '/models/honda_civic_type_r.glb'
const IMAGES = [
  '/hero/backdrop.webp', '/hero/blue.webp', '/hero/red.webp', '/hero/white.webp',
  '/hero/wheel_blue_f.webp', '/hero/wheel_red_f.webp', '/hero/wheel_red_r.webp', '/hero/wheel_white_f.webp', '/hero/wheel_white_r.webp',
  '/sensing/cars/blue_front.webp', '/sensing/cars/blue_side.webp', '/sensing/cars/grey_top.webp',
  '/sensing/cars/red_side.webp', '/sensing/cars/red_top.webp', '/sensing/cars/white_side.webp',
]

// Read by the loading screen every frame. 0..1.
export const loadState = { progress: 0 }

let modelBlobUrl: string | null = null
export const modelSrc = () => modelBlobUrl ?? MODEL_URL

async function fetchModel(onFraction: (f: number) => void) {
  try {
    const res = await fetch(MODEL_URL)
    if (!res.ok || !res.body) throw new Error('model request failed')
    const total = Number(res.headers.get('content-length')) || 19_500_000
    const reader = res.body.getReader()
    const chunks: BlobPart[] = []
    let got = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value as BlobPart)
      got += value.byteLength
      onFraction(Math.min(1, got / total))
    }
    modelBlobUrl = URL.createObjectURL(new Blob(chunks, { type: 'model/gltf-binary' }))
  } catch {
    // If the preload fails, the Type-R section still streams the model itself.
  }
  onFraction(1)
}

function loadImage(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = src
  })
}

// Never wait more than a few seconds for web fonts, so an offline font host cannot block the site.
const fontsReady = () => Promise.race([
  document.fonts.ready.then(() => undefined),
  new Promise<void>((resolve) => setTimeout(resolve, 4000)),
])

async function run() {
  let glb = 0
  let img = 0
  let font = 0
  const update = () => { loadState.progress = 0.8 * glb + 0.15 * img + 0.05 * font }
  let imgDone = 0
  const imgs = Promise.all(IMAGES.map((src) => loadImage(src).then(() => {
    imgDone++
    img = imgDone / IMAGES.length
    update()
  })))
  const model = fetchModel((f) => { glb = f; update() })
  const fonts = fontsReady().then(() => { font = 1; update() })
  await Promise.all([model, imgs, fonts])
  loadState.progress = 1
}

let started: Promise<void> | null = null
// Shared, so React's double-mount in development does not download the model twice.
export function preloadAll(): Promise<void> {
  if (!started) started = run()
  return started
}
