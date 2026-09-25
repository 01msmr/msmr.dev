# msmr.dev

[msmr.dev](https://msmr.dev): an overview of personal projects in web and hardware, one screen per project.

A single static HTML file with no build step and no framework. The wordmark shrinks along one curve into the header while you scroll. Each project snaps into place as its own screen. Hovering a card fills it with the project's colour. Clicking shows a halftone of the project, and a double-click shows the full screenshot. The last screen links to every project.

## Files

| | |
|---|---|
| `index.html` | the whole page: markup, CSS and JS |
| `img/<name>.webp` | screenshot of a project: shown on double-click, and drawn as a halftone on click |
| `fonts/` | Geist and Geist Mono (Latin subset, SIL OFL), served from this site |
| `.htaccess` | caching and compression rules for the server |

## Local preview

```sh
python3 -m http.server 8765        # then open http://localhost:8765
```

The simple server lets the browser cache pages. Reload with Cmd+Shift+R after changes.

## Deployment

Push to `main`. The server at netcup pulls from GitHub.

## Adding a project

1. Copy a `<section class="slide">` block in `index.html`. Change its `id`, number, details, title, tagline and text. Projects are ordered newest first.
2. Give it a colour. Add a `--c-…` variable in `:root` with the same lightness and chroma as the others (`oklch(70% .2 <hue>)`).
3. Add it to the nav, to the link list on the last screen, and to the counter (`/ 07`).
4. Image (optional): save a screenshot, about 1600 px wide, as WebP:

   ```sh
   magick screenshot.png -resize 1600x -quality 72 img/<name>.webp
   ```

   Give the card `data-shot="img/<name>.webp?v=1"` and the two image elements (`<canvas class="shot">` and `<span class="shot full">`), as on the other cards. The halftone is drawn in the browser from that one image. When you replace an image, raise the `?v=` number so browsers load the new one.

## Notes

- External project links open in a new tab. Do Day links to its README, because the app itself is private.
- Colours follow the system's light or dark mode.
- Images load only when a card is first touched or hovered, and fonts come from this site, not from Google.
- On touch screens, the card on screen fills with its colour once it snaps into place.
- Motion respects `prefers-reduced-motion`.
- Without JavaScript the page still reads top to bottom, with a small static wordmark.
