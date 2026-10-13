import handTop from './assets/hand-chrome-top.jpg'
import handLeft from './assets/hand-chrome-left.jpg'

// Honda "H" emblem, drawn as a single path so it scales cleanly.
export function Emblem({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 30" className={className} aria-hidden="true">
      <path d="M3 1h6v9.5h22V1h6v28h-6V18.5H9V29H3z" fill="currentColor" />
    </svg>
  )
}

// Part one (section4-1): the card key turns in a loop, floats slightly, and two chrome hands reach toward it.
export default function KeyScene() {
  return (
    <div className="relative h-full w-screen overflow-hidden bg-[radial-gradient(ellipse_at_30%_20%,#4a4f57_0%,#23272e_45%,#0b0d11_100%)]">
      {/* Chrome hands, one from the top-left and one from the bottom-left */}
      <img src={handTop} alt="" className="sk-reach-r pointer-events-none absolute left-[6%] top-[-2%] w-[30vw] mix-blend-screen opacity-80" />
      <img src={handLeft} alt="" className="sk-reach-l pointer-events-none absolute bottom-[-6%] left-[24%] w-[26vw] mix-blend-screen" />

      {/* Card reader block on the right */}
      <div className="absolute right-[6%] top-[18%] h-[62%] w-[22%] rounded-[2px] bg-gradient-to-r from-[#3a3f47] via-[#1d2027] to-[#14161b] shadow-[inset_2px_0_0_rgba(255,255,255,0.06)]" />

      {/* Card key */}
      <div className="absolute left-[30%] top-[30%] w-[38%] [perspective:1200px]">
        <div className="sk-float">
          <div className="sk-spin relative aspect-[1.75/1] w-full rounded-[1.6vw] bg-[linear-gradient(135deg,#1a1d24,#07080b_60%,#0f2445)] shadow-[0_3vh_6vh_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.08)]">
            <div className="absolute inset-[4%] rounded-[1vw] border border-white/5" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Emblem className="h-[22%] w-auto text-[#eef2f7]" />
            </div>
          </div>
        </div>
      </div>

      {/* Copy, bottom-left as in the print */}
      <div className="absolute bottom-[10%] left-[10%] max-w-[22vw] text-[clamp(10px,0.9vw,14px)] uppercase leading-relaxed tracking-[0.08em] text-white/85">
        <p className="mb-[1vh] font-bold">Card Key:</p>
        <p>Smart door control system with the new Honda smart key card. Elegant design, easy to carry, allowing you to lock and unlock the car.</p>
      </div>
    </div>
  )
}
