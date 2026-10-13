import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './sensing/scenes.css'
import App from './App'
import LoadingScreen from './loader/LoadingScreen'
import { preloadAll } from './lib/preload'

// The site mounts only after the model, images and fonts have loaded, so the first scroll is already smooth.
function Root() {
  const [ready, setReady] = useState(false)
  const [gone, setGone] = useState(false)
  useEffect(() => {
    let alive = true
    preloadAll().then(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [])
  return (
    <>
      {ready && <App />}
      {!gone && (
        <LoadingScreen
          ready={ready}
          onDone={() => { window.scrollTo(0, 0); setGone(true) }}
        />
      )}
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
