# msmr.dev

[msmr.dev](https://msmr.dev): an overview of personal projects in web and hardware, one screen per project.

A single static HTML file with no build step and no framework. The wordmark shrinks along one curve into the header while you scroll. Each project snaps into place as its own screen. Hovering a card fills it with the project's colour. Clicking shows a halftone of the project, and a double-click shows the full screenshot. The last screen links to every project.

## Files

| | |
|---|---|
| `index.html` | the whole page: markup, CSS and JS |
| `img/<name>.jpg` | screenshot of a project (shown on double-click) |
| `img/<name>.svg` | the same screenshot as a halftone (shown on click) |
| `tools/halftone.py` | turns a screenshot into the halftone SVG |

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
4. Images (optional): save a 1600 px wide screenshot as `img/<name>.jpg`, then run

   ```sh
   python3 tools/halftone.py img/<name>.jpg img/<name>.svg
   ```

   Add `style="--img:url(img/<name>.svg);--full:url(img/<name>.jpg)"` and the two `<span class="shot">` elements to the card, as on the other cards.

## Notes

- External project links open in a new tab. Do Day links to its README, because the app itself is private.
- Colours follow the system's light or dark mode.
- Motion respects `prefers-reduced-motion`.
- Without JavaScript the page still reads top to bottom, with a small static wordmark.
