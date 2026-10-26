# Home page: redesign plan (page override)

Order and purpose of the sections, each with its reduced-motion fallback. Sections keep their existing 3D or
imagery where it works; the layout and copy are re-examined against the skill's checklist.

1. **Hero (Civic RS, rotating model).** One primary CTA ("Explore the RS"). Reduced motion: static hero image, no auto-rotation.
2. **Sensing.** Feature strip with visible focus, 44px controls, swipe alternative to dragging.
3. **Type-R (3D, scroll-scrubbed).** Reduced motion: each step shown as a static frame.
4. **Smart key (pinned horizontal scroll).** Phone: stage fills the height (done). Copy must not overlap the card key.
   Reduced motion: no pinning; the two parts stack vertically.
5. **Civic RS (3D roll-in + sound).** Sound button labelled and `aria-pressed`. Reduced motion: car shown settled, no roll-in,
   no sound autoplay (sound was already off by default).

Responsive targets: 375, 768, 1024, 1440 px, portrait and landscape. No horizontal scroll.
