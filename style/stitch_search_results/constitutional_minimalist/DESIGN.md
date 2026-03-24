# Design System Document

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Living Archive."** 

This system rejects the frantic, "app-like" density of modern SaaS in favor of a quiet, academic authority. It is designed to feel like a high-end digital manuscript or a prestigious research journal. We achieve this by prioritizing **functional typography** over decorative chrome. The layout breaks the "standard grid" through intentional asymmetry—using wide margins and off-center alignments to create a sense of curated breathing room. Every element exists because it is necessary, not because it is a default.

---

## 2. Colors
Our palette is rooted in a "paper-and-ink" philosophy, utilizing subtle tonal shifts to define space rather than rigid lines.

### Surface Hierarchy & Nesting
To move beyond a flat, "out-of-the-box" UI, we use **Tonal Layering**. Treat the screen as a series of stacked, high-quality papers.
- **Base Layer:** Use `surface` (#f7f9ff) for the primary canvas.
- **Content Blocks:** Use `surface_container_low` (#ecf4ff) to define secondary zones.
- **Elevated Insights:** Use `surface_container_lowest` (#ffffff) for the most critical interactive cards or code blocks, creating a soft "lift" against the off-white background.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to section content. Boundaries must be defined exclusively through background color shifts. For example, a sidebar should be `surface_container` (#e6effa) sitting flush against a `surface` background. The change in hex value is the "border."

### Signature Textures
While the system is minimal, CTAs should feel "inked." Use a subtle vertical gradient from `primary` (#0051ae) to `primary_container` (#0969da) for primary buttons. This adds a microscopic level of depth that feels professional and intentional, avoiding the "flat-design" fatigue.

---

## 3. Typography
Typography is the primary architecture of this system. We pair a high-contrast serif for authority with a precision sans-serif for utility.

- **The Voice (Newsreader):** Used for all `display` and `headline` roles. This serif brings a scholarly, editorial weight. Use `display-lg` (3.5rem) with generous `16` (5.5rem) top-spacing to let the document "breathe."
- **The Engine (Inter):** Used for `title`, `body`, and `label` roles. Inter provides high legibility for dense technical data. 
- **Tonal Contrast:** Use `on_surface_variant` (#424753) for sub-headers to create a clear hierarchy between the "Subject" (Dark Charcoal) and the "Context" (Subtle Grey).

---

## 4. Elevation & Depth
In an academic environment, "depth" is subtle. We avoid heavy shadows in favor of ambient light.

- **The Layering Principle:** Depth is achieved by stacking tiers. A `surface_container_highest` (#dae3ef) element on a `surface` (#f7f9ff) background creates a natural visual hierarchy without a single pixel of shadow.
- **Ambient Shadows:** For floating menus or modals, use an extra-diffused shadow: `box-shadow: 0 20px 50px rgba(20, 28, 37, 0.06);`. The shadow color is a 6% opacity version of `on_surface`, mimicking how light hits physical paper.
- **Glassmorphism:** For top navigation bars, use `surface` at 80% opacity with a `backdrop-blur: 12px`. This allows content to bleed through as the user scrolls, maintaining a sense of place within the document.
- **The Ghost Border Fallback:** If a border is required for accessibility (e.g., in high-contrast modes), use `outline_variant` (#c2c6d6) at **15% opacity**. Never use a 100% opaque border.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_container`), `on_primary` text. Radius: `md` (0.375rem).
- **Secondary:** No background, no border. Use `primary` text with an underline that appears only on hover. This maintains the "Editorial" feel.
- **Tertiary:** `surface_container_high` background with `on_surface` text.

### Input Fields
- **Styling:** Forgo the four-sided box. Use a `surface_container_low` background with a 2px `primary` bottom-border that activates only on focus.
- **Typography:** Labels should use `label-md` in `on_surface_variant`.

### Cards & Lists
- **Rule:** Forbid divider lines.
- **Implementation:** Separate list items using the `3` (1rem) spacing scale. For cards, use a background shift to `surface_container_lowest`. If content is dense, use a "White Space Divider"—a large gap of `5` (1.7rem) instead of a grey line.

### Editorial Sidebars (Additional Component)
- **Contextual Annotations:** Small, `body-sm` notes set in `on_tertiary_fixed_variant` placed in the right-hand margin. This mimics scholarly marginalia and breaks the rigid center-column layout.

---

## 6. Do's and Don'ts

### Do
- **Do** use asymmetrical margins. Aligning text to the left while leaving the right 30% of the screen empty creates a premium, "gallery" feel.
- **Do** use `20` (7rem) or `24` (8.5rem) spacing between major sections.
- **Do** treat "Empty States" as opportunities for beautiful, centered `Newsreader` typography.

### Don't
- **Don't** use icons unless absolutely necessary for navigation. Prefer text labels.
- **Don't** use pure black (#000000). Use `on_background` (#141c25) to maintain the "ink on paper" softness.
- **Don't** use standard "drop shadows" or 1px borders. If you feel the need for a line, try using a slightly darker background color instead.