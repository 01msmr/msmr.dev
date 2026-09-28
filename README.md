# msmr.dev

[msmr.dev](https://msmr.dev): web projects, one screen per project.

No build step and no framework. The server renders one PHP page from a JSON list of projects. The wordmark shrinks along one curve into the header while you scroll. Each project snaps into place as its own screen. Hovering a card fills it with the project's colour like a thick liquid that bulges toward the cursor. Clicking shows a halftone of the project, and a double-click shows the full screenshot. The last screen links to every project.

## Files

| | |
|---|---|
| `projects.json` | **the one source for all projects**: name, colour, links, text, tech, image. Cards, nav, link list, counter and icons are all built from it |
| `index.php` | the page template, rendered on every request |
| `style.css`, `main.js` | styling and behaviour. Shared values (colours, line width `--stroke`, nav timing `--nav-t`/`--nav-ease`) live in `:root` of `style.css`; `main.js` reads the nav timing from there and is organised in numbered blocks (see its header) |
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

   `hue` is chroma and hue of the colour `oklch(70% chroma hue)`. Keep the chroma around 0.15–0.22 and choose a hue that is free. A title part without `url` is plain text. `shot` is optional.

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

**Header.** The wordmark shrinks along one Bézier curve (left first, then up) from the full-width start screen into the header, as a real font-size transition. The header bar and nav slide in by one bar height at the same speed as the wordmark's last rise and arrive with it; on touch devices without fading.

**Navigation** (layout by width):

| Width | Nav |
|---|---|
| ≥ 1100 px | all names, dividers, counter; a colour window slides between items (following the mouse), its colour switching at the item edges; on desktop a 2 px line just below the bar marks the active item and stays there while the window follows the mouse; it is cut from the same colour band as the window, so wherever both are at the same position their colours match, also while moving |
| 1024–1099 px | the same, tighter, without counter |
| 700–1023 px | active item centred beside the wordmark, 2 numbered neighbours per side, `‹ ›` beyond |
| < 700 px | active item, 1 neighbour per side, `‹ ›` beyond; invisible placeholders keep the layout constant at both ends |

In the narrow nav the active item always sits in the centre. On a switch the colour window resizes around it and crossfades, and the numbers slide to their new places: the incoming number pushes the others sideways out of the centre, on both sides; new numbers slide in from outside and old ones slide out and fade, all in 0.45 s (`--nav-t` in `style.css`, also read by `main.js`). With a mouse wheel or trackpad the strip works like a picker: numbers only while scrolling, the centred item becomes active on release. On touch devices, pressing anywhere on the strip aims (a plain tap on a neighbour switches to it): the colour window in the centre grows to fit the longest name and all numbers appear beside it. Dragging sideways slides the numbers through the fixed window, which shows the name and colour of the project inside it. On release the window shrinks to the chosen name and the page glides there.

**Cards.** Hover (desktop) fills a card like a thick liquid that bulges toward the cursor. On touch devices the card fills once it has settled and stays full while it leaves the screen; the nav switches at the same moment. Keyboard focus fills a card as well. Its border is the project colour, 2 px like the big number's outline and the line under the nav window (all set by `--stroke` in `style.css`), and on desktop the big number overlaps the top edge by about 2 px, as on the phone.

**Image and details.** A click (tap) on a card shows a halftone of the screenshot, drawn in the browser; a double-click on the halftone shows the full screenshot. On touch devices a double-tap shows the full screenshot straight away, and another double-tap goes back to the halftone. After 11 s without activity the image fades out. Tech details grow on hover; on touch devices a tap enlarges one. An enlarged detail is in the project colour on an empty card and white on a filled one; while the liquid rises the colour changes exactly at its surface. On touch, while a detail is open the next tap anywhere only closes it (no halftone, no link). A card scrolled fully out of view comes back plain: image hidden, detail closed.

## Notes

- External project links open in a new tab; links to msmr.dev itself don't. Do Day links to its README, because the app itself is private.
- Colours follow the system's light or dark mode.
- Right after the page has loaded, all screenshots are fetched and their halftones drawn one after another, so fast scrolling never meets an unloaded card. Fonts come from this site, not from Google.
- On touch devices there is no text selection, loupe or grey tap flash, so holding and tapping stay with the page's own gestures. Pinch zoom stays, and project links keep their long-press menu.
- Motion respects `prefers-reduced-motion`: pages jump instead of gliding, cards fill plainly instead of as a liquid, and the cursor has no trail.
- Without JavaScript the page still reads top to bottom, with a small static wordmark.
