
---

## Project decisions (Honda Civic site redesign)

These override the generated defaults above, recorded so the change is explicit:

- **Theme: dark, not light.** The generated palette is light SaaS. The Honda Civic site is a dark, cinematic product site, so the
  background is `#05070d` / `#0b0d12` and text is `#f5f7fa`. The skill's checks still apply (contrast 4.5:1, visible focus,
  reduced motion).
- **Accent: Honda red `#dc2626`** (the generated accent, kept). Used for the primary CTA and the RS mark only.
- **Typography: Montserrat** (already loaded in `index.html`). The generated Outfit/Rubik pairing is not used, to avoid a second
  font download and to keep the Honda look.
- **Motion:** scroll and 3D sections keep their motion, but every section has a reduced-motion path that shows the final
  readable state with no scroll-scrub or looping motion.
- **Sound:** optional and off by default. Turned on by the visitor only (see `src/lib/sound.ts`).
- **Responsive:** verified at 375px, 768px, 1024px and 1440px (the skill's list), portrait and landscape.

## Skill rules applied to this site

- Icons: SVG only, no emoji. Decorative images are `aria-hidden`.
- Touch targets: at least 44×44px for every button and link.
- No horizontal scroll at any width.
- Reserve image and canvas space before load so the layout does not shift.
- Lazy-load every 3D scene and heavy image until its section is near the viewport.
- Hover states: 150–300 ms transitions. Press states must not move the layout.
