# msmr.dev

[msmr.dev](https://msmr.dev): web & more, one screen per project. On the site this project is called “paged portfolio”; its repository is [01msmr/paged-portfolio](https://github.com/01msmr/paged-portfolio) (renamed from msmr.dev — GitHub forwards the old address, also for `git pull`).

No build step and no framework. The server renders one PHP page from a JSON list of projects. The wordmark shrinks along one curve into the header while you scroll. Each project snaps into place as its own screen. Hovering a card fills it with the project's colour like a thick liquid that bulges toward the cursor. Clicking shows a halftone of the project, and a double-click shows the full screenshot. The last screen links to every project.

## Files

| | |
|---|---|
| `projects.json` | **the one source for all projects**: name, colour, links, text, tech, image. Cards, nav, link list and icons are all built from it |
| `index.php` | the page template, rendered on every request |
| `style.css`, `main.js` | styling and behaviour. Shared values (colours, line widths `--stroke`/`--nav-line`, nav timing `--nav-t`/`--nav-ease`) live in `:root` of `style.css`; `main.js` reads the nav timing from there and is organised in numbered blocks (see its header) |
| `img/<name>.webp` | screenshot of a project: shown on double-click, and drawn as a halftone on click |
| `fonts/` | Hanken Grotesk (Latin subset, SIL OFL), served from this site; used for everything |
| `app-icons/`, `site.webmanifest.php` | favicons, iOS and Android icons in every project colour; page and manifest pick one at random on each request |
| `tools/icons.py` | regenerates the icons from `projects.json` (needs fontTools and ImageMagick) |
| `.htaccess` | caching and compression rules for the server |

## Local preview

```sh
php -S localhost:8765        # then open http://localhost:8765
```

This needs PHP (`brew install php`). The built-in server runs the page exactly as the live server does.

## Deployment

Push to `main`. A GitHub webhook tells the netcup server to pull.

`style.css` and `main.js` are linked with their modification time (`?v=…`), so browsers cache them for a year and still load a new version right after a change. The page itself is always fetched fresh.

## Adding a project

1. Add an entry to `projects.json`, in timeline position (newest first):

   ```json
   {
     "id": "short-id",
     "name": "Name in the nav",
     "hue": [0.2, 120],
     "url": "https://… (link on the last screen)",
     "title": [{ "label": "Title", "url": "https://…" }],
     "text": "One short line.",
     "tech": ["…", "Claude"],
     "shot": "img/short-id.webp?v=1"
   }
   ```

   `hue` is chroma and hue of the colour `oklch(70% chroma hue)`, optionally with a third value for the lightness (e.g. `[0.17, 95, 0.86]` for a clear yellow — yellows need more than 70 % to look friendly instead of ochre). Keep the chroma around 0.15–0.22 and choose a hue that is free. A title part without `url` is plain text. `shot` is optional.

2. Regenerate the icons so there is one per project colour: `python3 tools/icons.py`.
3. Image (optional): save a screenshot, about 1600 px wide, as WebP:

   ```sh
   magick screenshot.png -resize 1600x -quality 72 img/<id>.webp
   ```

   When you replace an image, raise the `?v=` number in `shot` so browsers load the new one.

## Behaviour

**Scrolling: one project per gesture.** The script moves the page, so every gesture lands exactly on a card edge. On desktop, CSS scroll snapping stays only as a backstop, for example when you drag the scrollbar.

- **Desktop:** a mouse-wheel notch or trackpad swipe moves one card; trackpad momentum is ignored. The glide takes over the speed of the gesture (ease-out, duration = 3 × distance ÷ speed), 0.3–0.65 s, start ↔ 01 up to 1.05 s. Arrow keys (↑ ↓ ← →), Page Up/Down and Space move one card, and so does a sideways trackpad swipe.
- **Touch (iPhone/iPad):** the page scrolls inside `.pager` (iOS snaps the whole page only after the momentum and then corrects visibly). The finger drives the page 1:1; on release a quick swipe or a quarter-screen drag moves one card, otherwise it springs back. The glide continues at the finger's release speed and settles on the edge, 0.25–0.52 s, start ↔ 01 up to 0.9 s. The liquid in the target card starts rising 0.33 s before the glide ends. Sideways swipes move one card, like vertical ones. Cards taller than the screen scroll freely inside.

**Header.** Below the full-width wordmark the start screen reads “web & more.”; where the rising wordmark passes over it, the line is hidden exactly at the letters' lower edge. The wordmark shrinks along one Bézier curve (left first, then up) from the full-width start screen into the header, as a real font-size transition, over the first 72 % of the start screen with a long, soft end. The bar is 51 px high (`--bar-pad` above and below the 30 px wordmark). The header bar and nav slide in by one bar height at the same speed as the wordmark's last rise and arrive with it; on touch devices without fading.

**Navigation** (layout by width):

| Width | Nav |
|---|---|
| ≥ 1100 px | all names with dividers; the colour window follows the mouse |
| 1024–1099 px | the same, tighter |
| 700–1023 px | active item centred beside the wordmark, 2 numbered neighbours per side, `‹ ›` beyond |
| < 700 px | active item with `‹ ›` beside it, which lead to the direct neighbours (no neighbour numbers, so long names fit); invisible placeholders keep the layout constant at both ends |

In every nav, 01 is already active on the start screen (name, window, line), so nothing moves on the switch start → 01. In the narrow nav an `↑` in front of 01 is only a target: tapping or aiming at it takes you to the start screen (while aiming the window shows “start”); it never becomes active, and on the start screen the nav is out of view anyway. In the full nav the wordmark itself is that target: hovering it moves the window behind it — from the card's left edge to 1 rem past the wordmark (dark grey, the letters turning light exactly at its edges), and clicking it goes to the start screen. In the full nav (from 1024 px) the colour window slides between items. Its colour switches at the item edges, and the text colour changes exactly at the window's edges, also while it glides, never fading. On desktop a 3 px line (`--nav-line`) just below the bar marks the active item and stays there while the window follows the mouse. It is cut from the same colour band as the window, so wherever both stand their colours match. On desktop one margin surrounds the card, as high as the bar plus that line (54 px): the nav fills it above the card, and it is equally wide beside and below the card; the wordmark sits on it too (on touch devices the card starts right at the bar). With a mouse the nav text is dimmed to 33 % while the cursor is outside the nav and full over it, fading in 1.6 s (the active item, window, line and wordmark always stay full), the nav items have 40 % more padding at the sides, and the nav type grows with the window from 1× at 1024 px to 1.8× where all names fit (≈ 1560 px).

In the narrow nav the numbers are exactly as tall as the lowercase letters of the wordmark and sit, like the names, vertically centred in the window, with 50 % more padding beside them than before. The active item always sits in the centre. On a switch the colour window resizes around it, and window and text colour change at once, together. No number ever slides through the window: the new project stands in it as its name straight away, the previous one starts right at the window's edge and slides out, pushing the others sideways, on both sides. Numbers that disappear fade first; new ones, and numbers turning into `‹ ›`, fade in afterwards, so two never overlap. All in 0.45 s (`--nav-t` in `style.css`, also read by `main.js`). With a mouse wheel or trackpad the strip works like a picker: numbers only while scrolling, the centred item becomes active on release. On touch devices, pressing anywhere on the strip aims (a plain tap on a neighbour switches to it): the colour window in the centre grows to fit the longest name and all numbers appear beside it. Dragging sideways slides the numbers through the fixed window, which shows the name and colour of the project inside it; the window's colour fades from project to project in 0.66 s, the text switches at once. On release the window shrinks to the chosen name and the page glides there.

**Cards.** Hover (desktop) fills a card like a thick liquid that bulges toward the cursor. On touch devices the card fills once it has settled and stays full while it leaves the screen; the nav switches at the same moment. Keyboard focus fills a card as well. Its border is the project colour, 2 px like the big number's outline (both set by `--stroke` in `style.css`), and the big number's digits reach 1 px over the card's top edge, so their tops open the border (any number 01–99, on every device; the number itself doesn't drift with scrolling). The part of the digits above the card's edge is shown on top of the bar too, by a copy that belongs to the card and moves with it (fill only, no outline) — on every device. Whether it shows depends only on the scroll position: at rest and while the card is pulled down (the previous project appearing above) it shows; as soon as the card moves up under the bar by 1 px it is gone. No timers, no fades; without scroll-linked animations (older browsers) or with reduced motion it stays off.

The line under a card's title starts exactly below the title's first letter (measured per card, since the large title's first letter carries 5–11 px more side space).

**Far targets.** Choosing a far project or the links page from the nav (click, aim, strip): only the current card slides out and the target slides in right behind it, one card's length like a scroll gesture; the cards in between never show. Back to the start screen it glides from 01, so the wordmark takes its curve.

**Image and details.** A click (tap) on a card shows a halftone of the screenshot, drawn in the browser; a double-click on the halftone shows the full screenshot. On touch devices a double-tap shows the full screenshot straight away, and another double-tap goes back to the halftone. After 11 s without activity the image fades out. Tech details grow on hover; on touch devices a tap enlarges one. An enlarged detail is in the project colour on an empty card and white on a filled one; while the liquid rises the colour changes exactly at its surface. On touch, while a detail is open the next tap anywhere only closes it (no halftone, no link). A card scrolled fully out of view comes back plain: image hidden, detail closed.

## Notes

- Hovering a link (card titles, links page) shows a pill in the project colour; it reaches 0.225 em beyond the name on the left and 0.29 em on the right — the tight letter spacing (−0.065 em) also trims the space after the last letter, so the right side gets that back and both sides look equal.
- External project links open in a new tab; links to msmr.dev itself don't. “paged portfolio” (this site) links to its repository on GitHub; Do Day links to its README, because the app itself is private.
- Colours follow the system's light or dark mode; in light mode page and bar are pure white.
- On desktop the nav type is 1.8× larger (`--fs-s`) and all text inside the cards — titles (also on the links page), tech details at rest, the line under a title — 1.4× (`--fs-c`, both in `style.css`); an enlarged detail and the big numbers keep their size.
- Right after the page has loaded, all screenshots are fetched and their halftones drawn one after another, so fast scrolling never meets an unloaded card. Fonts come from this site, not from Google.
- On touch devices there is no text selection, loupe or grey tap flash, so holding and tapping stay with the page's own gestures. Pinch zoom stays, and project links keep their long-press menu.
- Motion respects `prefers-reduced-motion`: pages jump instead of gliding, cards fill plainly instead of as a liquid, and the cursor has no trail.
- Without JavaScript the page still reads top to bottom, with a small static wordmark.
