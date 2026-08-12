# PQC.LAB Opening, Visual Polish, and Game Controls Design

## Goal

Improve the public cyberpunk portfolio with a name-driven opening sequence, stronger visual cohesion, smoother interactions, and clearer desktop/mobile game controls. Preserve the approved public content and keep the site static, lightweight, and reliable under multiple visitors.

## Approved Scope

- Use option A, “Chip Awakening,” for the opening.
- Keep the public identity `潘泉承`, `上海理工大学`, `PQC.LAB`, and `panquancheng2006@163.com`.
- Keep the existing projects, awards, Edgi-Talk GitHub link, privacy exclusions, and runner obstacle rules.
- Do not add a portrait, GPA, phone number, address, QQ email, or detailed college/department.
- Publish the finished site to the existing GitHub Pages address.
- Place the final ZIP only in `H:\YINGSI\简历` and remove the ZIP copy currently stored on C:.

## Opening Sequence

The opening is a full-screen, approximately three-second sequence shown before the page becomes interactive:

1. A dark circuit board fades in.
2. Cyan and magenta signals travel inward along circuit traces.
3. The signals activate a central chip marked `PQC`.
4. The chip reveals `潘泉承 / PAN QUANCHENG`.
5. The opening dissolves into the existing hero section so the chip motif feels continuous rather than separate.

The opening includes a visible “跳过动画” control. After a completed or skipped opening, the current local date is stored in the browser; further visits on the same day go directly to the page. If storage is unavailable, the site continues without an error. If the visitor prefers reduced motion, use a brief static name reveal instead of the full sequence.

The opening must be created with local HTML, CSS, and JavaScript only. It must not load video, external fonts, large libraries, or remote animation assets. The overlay is created or activated safely so a script failure cannot leave the page permanently blocked.

## Overall Visual Polish

- Strengthen the chip and circuit visual language across the hero, buttons, section headings, project cards, awards, and closing panel.
- Let the hero content enter in a coordinated sequence after the opening finishes.
- Add subtle section reveal transitions as content enters the viewport.
- Keep the existing pointer/touch-responsive circuit background, but limit updates and reduce detail on small or low-motion devices.
- Improve spacing, contrast, hover/focus feedback, and mobile layout without rewriting unrelated page content.
- Pause decorative motion when the page is hidden and respect `prefers-reduced-motion` everywhere.

## Game Controls and Mobile Experience

### Desktop

- Primary jump control: `W`.
- Primary duck control: hold `S`; release `S` to stand.
- Keep Space/ArrowUp and ArrowDown as secondary compatibility controls.
- Update all visible instructions to lead with `W` and `S`.

### Mobile

- Show two large controls below the game: `跳跃` and `蹲下`.
- Tapping `跳跃` triggers one jump.
- Pressing and holding `蹲下` keeps the character ducking; releasing or cancelling the touch makes the character stand.
- Keep canvas tap as an optional jump shortcut, but make the labeled buttons the primary instructions.
- Use pointer events so touch, stylus, and mouse follow the same control path and avoid delayed or duplicated input.

### Smoothness

- Base movement on elapsed frame time rather than assuming a fixed frame rate.
- Cap abnormally large frame gaps so returning to the tab cannot cause sudden obstacle jumps.
- Avoid unnecessary per-frame work and reuse game objects where practical.
- Limit canvas detail on smaller devices while keeping obstacle silhouettes and collision rules unchanged.
- Pause cleanly when the tab is hidden and resume without a large time jump.
- Ground obstacles still require jumping; flying wire and laser obstacles still require ducking. Jumping into a flying hazard must remain a failure.

## Data and Interaction Flow

1. The document loads the existing portfolio content immediately.
2. The opening controller checks reduced-motion preference and the saved daily completion marker.
3. It either plays the opening, shows the brief static reveal, or proceeds directly to the hero.
4. Completion and skip use the same cleanup path, remove the blocking state, and start page reveal effects.
5. The game adapter converts keyboard and pointer inputs into the existing jump/duck commands.
6. The game core remains independent of the page controls so timing and collision behavior can be tested separately.

## Failure Handling

- A storage access failure must not block page entry.
- Missing motion or observer browser features fall back to a visible, usable page without animation.
- Repeated keydown events must not create duplicate jumps.
- Pointer release, pointer cancel, window blur, and page hiding must always clear duck state.
- The game must not advance through a large hidden-tab time gap.

## Verification

- Unit tests cover the daily opening decision, skip/completion cleanup, W/S mapping, held duck state, pointer cancel/release, time-gap capping, and existing obstacle rules.
- Site contract tests continue checking approved identity data, the correct award, the Edgi-Talk link, and all privacy exclusions.
- Browser checks cover desktop and mobile layout, opening playback, skip behavior, same-day revisit behavior, reduced motion, keyboard W/S controls, mobile touch controls, game rendering, and horizontal overflow.
- Run a sustained game check to confirm stable animation timing and no page errors.
- Verify the deployed public URL after publishing.
- Verify the new ZIP opens correctly from `H:\YINGSI\简历` and no portfolio ZIP remains under the C: project outputs directory.

