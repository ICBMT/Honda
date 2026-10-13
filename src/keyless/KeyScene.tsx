import handRight from './assets/hand-right.png'
import handLeft from './assets/hand-left.png'
import logo from './assets/honda-logo.png'

// Honda H emblem (generated logo, transparent background).
export function Emblem({ className = '' }: { className?: string }) {
  return <img src={logo} alt="" aria-hidden="true" className={className} draggable={false} />
}

// Part one (section4-1), turned to read horizontally: the text sits top-centre, the card
// key is centre-left, the solid card reader is bottom-right, and the chrome hands come in
// from the right (top) and the left (bottom), reaching toward the card.
export default function KeyScene() {
  return (
    <div className="relative h-full w-screen overflow-hidden bg-[radial-gradient(ellipse_at_40%_15%,#8c929b_0%,#4d525a_35%,#22252b_70%,#121418_100%)]">
      {/* Copy */}
      <div className="absolute left-[36%] top-[16%] w-[15vw] text-[clamp(9px,0.75vw,13px)] uppercase leading-[1.5] tracking-[0.08em] text-white/90">
        <p className="font-bold">Card Key:</p>
        <p>Smart door control system with the new Honda smart key card. Elegant design, easy to carry, allowing you to lock and unlock the car.</p>
      </div>

      {/* Card reader: a solid block with a lit left face, as in the print */}
      <div className="absolute left-[46%] top-[56%] h-[36vh] w-[38vw] shadow-[0_2vh_4vh_rgba(0,0,0,0.5)]">
        <div className="absolute inset-y-0 left-0 w-[6%] bg-gradient-to-r from-[#8d939b] to-[#4b5058]" />
        <div className="absolute inset-y-0 left-[6%] right-0 bg-[linear-gradient(90deg,#3b4048_0%,#2a2e35_40%,#1b1e24_100%)]" />
        <div className="absolute inset-y-[8%] left-[7%] w-[1.2%] bg-gradient-to-b from-transparent via-white/25 to-transparent" />
      </div>

      {/* Card key */}
      <div className="absolute left-[24%] top-[30%] w-[34vw] [perspective:1400px]">
        <div className="sk-float">
          <div className="sk-spin relative aspect-[1.75/1] w-full rounded-[1.4vw] bg-[linear-gradient(135deg,#2a2e36,#0a0c10_55%,#10233f)] shadow-[0_3vh_6vh_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.08)]">
            <div className="absolute inset-[3%] rounded-[1vw] border-r-[0.5vw] border-b-[0.5vw] border-[#1f4a86]/70" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Emblem className="h-[26%] w-auto drop-shadow-[0_0_0.4vw_rgba(255,255,255,0.35)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Hands: top-right reaching left, bottom-left reaching right */}
      <img src={handRight} alt="" draggable={false} className="sk-reach-r pointer-events-none absolute right-[-4%] top-[16%] w-[46vw] select-none" />
      <img src={handLeft} alt="" draggable={false} className="sk-reach-l pointer-events-none absolute bottom-[-4%] left-[-6%] w-[44vw] select-none" />
    </div>
  )
}
