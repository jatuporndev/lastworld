---
name: ui-style
description: How LAST WORLD's user interface should look and how to change it. Use before adding or restyling any screen, HUD element, menu, button, card, or other UI in this game, and whenever asked to "improve the UI", make it "more modern", "cleaner", or "cooler".
---

# LAST WORLD UI style

The UI is a **board game laid out on a wooden table**. Everything the player touches is a game
component: paper slips, cards, round tokens. It is not a web page and must never look like one.

## The look

1. **On the board: no panels.** HP bars, names, turn order, hints and resources sit straight on the
   scene with a text shadow (`--tshadow`). No boxes, borders or blurred backdrops behind them.
2. **Off the board: cream paper with dark ink.** Modals, the journal, info slips, tooltips and toasts
   are `--paper` with `--ink-d` text. Flat fill, a hard drop shadow (`0 0.35em 0 rgba(0,0,0,.28)`), no
   outline.
3. **Actions are labels and paper tags, never boxed web buttons.** No bordered rectangles with
   gradients, no glow on hover. A hover changes the fill (`--paper3` or `--coin`).
4. **A selection is marked with the coin colour** (a `--coin` ring or ink corner brackets), not a
   glowing border.
5. **Flat fills, no outlines, no gradients on surfaces.** Depth comes from one hard shadow under a
   component.
6. **Skill cards are the exception: small painted posters.** Dark ground, picture filling the card,
   words on a dark fade at the bottom. See "Skill cards" below.

## Tokens (defined in the "modern skin" block of `src/styles.css`)

| Token | Value | Use |
|---|---|---|
| `--paper` `--paper2` `--paper3` | `#f1e4c5` `#e3d2ab` `#cfbb8d` | paper surface, inset, hover |
| `--ink-d` `--dim-d` | `#3a2a20` `#806b54` | text and secondary text on paper |
| `--scene` `--dim` | `#fbf3df` `#cfc4ad` | text and secondary text on the board |
| `--accent` | `#d9482f` | primary action, danger |
| `--accent2` | `#1f8f86` | secondary action, "on" state |
| `--coin` | `#f2b632` | selection, cost tokens, highlights |
| `--radius` | `0.5em` | every corner |
| `--f-head` | Mitr | names, numbers, labels |
| `--f-body` | Inter + Noto Sans Thai | running text |

Use the tokens. Do not add new colours for a surface; add one only for a new game concept (a new
element or status) and put it in the data file next to that concept.

## Sizes and layout

- Everything is sized in `em`. The root font size scales with the window, so `px` breaks the scaling.
  The only `px` allowed is a 1px hairline.
- Phones play in landscape. Phone overrides live in the "phones" block at the end of `src/styles.css`.
  Touch targets are at least 2.6em. Anything shown on hover must also open on tap.
- Nothing may overlap the battle header (stage name, turn queue, hint: one line each) or cover a
  lifted hand card. Check z-order when adding anything near the bottom of the battle screen
  (`.hand` 75, `.slots-wrap` 70, `.slot-peek` 90).
- Text: skill names stay in English in every language. Everything else goes through `t()` and gets a
  Thai string in `src/i18n/th.js`.

## Skill cards

- Built by `cardEl()` in `src/ui/components.js`; picture from `cardArt(id)` in `src/ui/cardArt.js`.
- The picture is painted by code: chosen by the card's `icon`, coloured by its element (or category
  when neutral), varied by a seed from the card id, then given the gouache finish (fewer tones, brush
  strokes in one direction, warm dark edges). **Never use image files for card art**: a new card must
  get its picture with no extra work.
- A new icon needs one new painter in `PIC` in `cardArt.js`. Paint in the 600 × 860 space with the
  subject centred near (300, 300); the lower half is covered by text. Hot core, darker rim, a `halo`
  on top, on the near-black `P.bg`.
- Card text colours: name white with a hard black shadow, type label gold `#e9b45a`, body cream
  `#fbe9c4`, numbers yellow `#ffe08a` in a navy box `rgba(18,34,86,.9)` with a gold border.
- Frame colour shows rarity: cream common, blue rare, purple epic, gold legendary.

## Feedback ("juice")

Every player action answers within one frame: a hit has hit-stop, a knockback and a floating number;
a card played pops into its slot; a dice result is written to the small log at the bottom right. Use
the helpers that exist (`hitStop`, `slowMo`, `punch`, `floatText`, `screenFx`, `buzz`) before writing
a new effect. Animations are short (0.15 to 0.45 s) and never block input.

## Performance and data

- No lag is a hard rule. Paint canvases once and cache them; never repaint per frame or per render.
- No `backdrop-filter`, no large blurred shadows, no animation on properties other than `transform`
  and `opacity` for anything that is on screen during battle.
- UI changes must not add Firebase reads or writes.

## How to work

1. **Show first.** Build the change locally, take screenshots of the real game (desktop 1366 × 768
   and phone landscape), publish them as a preview, and wait for the owner's approval before
   committing or pushing. `main` deploys to production automatically.
2. Put style changes in the "modern skin" block of `src/styles.css` (phone changes in the "phones"
   block), each group under a one-line comment saying what the player sees.
3. Test in a headless browser with the page-error listener on, and report what was not tested.
4. A before/after pair is the clearest preview. Keep the old screenshot.

## Do not

- Pixel art, 3D characters, anime eyes, or art taken from reference images. Characters and monsters
  are procedural 2D sprites (`src/engine/chibi.js`, `src/engine/sprites.js`). The one exception is skill
  effects: they are pixel-art sprite sheets in `public/vfx`, chosen per card by `fxPlan()` in
  `src/engine/vfx.js` and baked by `tools/bake-vfx.mjs`. A new effect is a new `fx(...)` in `tools/vfx/effects.mjs`, drawn with the painter in `tools/vfx/kit.mjs` (its header lists the look every effect shares), never a
  picture drawn by hand or an effect simulated while the game runs.
- Boxed web buttons, glowing borders, glass panels, dark fantasy gold-on-black panels (the old look).
- A second resource display. Action Slots are the only turn resource.
