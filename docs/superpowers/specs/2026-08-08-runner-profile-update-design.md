# Runner and Profile Update Design

## Goal

Update the public cyberpunk portfolio so it can show approved identity details, link the embedded systems project to GitHub, strengthen chip/circuit visuals, and make the mini game richer with jump and duck controls.

## Public Profile Content

- Show the name: `潘泉承`.
- Show the undergraduate school: `上海理工大学`.
- Show the approved email: `panquancheng2006@163.com`.
- Continue hiding GPA, phone number, address, QQ email, and detailed college/department.
- Keep the public identity label `PQC.LAB`.

## Project Link

- Add a GitHub link on the first embedded chip competition project.
- Target URL: `https://github.com/p32qc3/Edgi-Talk`.
- The link should be visible and clearly associated with the first project only.

## Game Design

- Keep the existing neon runner style.
- Add two player actions:
  - Jump: Space or ArrowUp.
  - Duck: ArrowDown or on-screen duck button.
- Ground obstacles require jumping.
- Flying wire obstacles require ducking.
- Add varied obstacle types: scrap chip, e-waste block, flying wire, and laser line.
- Touch/click on the canvas should still start and jump, so mobile remains simple.

## Visual Design

- Preserve the selected cyberpunk look.
- Add chip/circuit motifs to the hero panel, project cards, and page background.
- Add lightweight pointer/touch background interaction so the circuit backdrop feels alive.
- Keep layout responsive with no horizontal overflow on mobile.

## Verification

- Unit tests must cover jump, duck, varied obstacles, approved public content, and privacy exclusions.
- The page must stay static and stable: no fetch, WebSocket, EventSource, or timer-driven server calls.
- Browser smoke checks must verify the page renders, game starts, canvas is nonblank, and desktop/mobile layouts have no horizontal overflow.
