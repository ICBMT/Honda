import { useEffect, useState } from 'react'
import Hero from './hero/Hero'
import Sensing from './sensing/Sensing'
import SensingMobile from './sensing/SensingMobile'
import { startSmoothScroll } from './lib/smooth'

const PHONE_QUERY = '(max-width: 767px)'

// Phones get the swipe carousel; larger screens keep the pinned horizontal scroll.
function useIsPhone() {
  const [phone, setPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY)
    const onChange = () => setPhone(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return phone
}

export default function App() {
  useEffect(() => startSmoothScroll(), [])
  const phone = useIsPhone()
  return (
    <>
      <Hero />
      {phone ? <SensingMobile /> : <Sensing />}
    </>
  )
}
