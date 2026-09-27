# msmr.dev

[msmr.dev](https://msmr.dev): web projects, one screen per project.

No build step and no framework. The server renders one PHP page from a JSON list of projects. The wordmark shrinks along one curve into the header while you scroll. Each project snaps into place as its own screen. Hovering a card fills it with the project's colour like a thick liquid that bulges toward the cursor. Clicking shows a halftone of the project, and a double-click shows the full screenshot. The last screen links to every project.

## Files

| | |
|---|---|
| `projects.json` | **the one source for all projects**: name, colour, links, text, tech, image. Cards, nav, link list, counter and icons are all built from it |
| `index.php` | the page template, rendered on every request |
| `style.css`, `main.js` | styling and behaviour. `main.js` is organised in numbered blocks (see its header) |
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

## Notes

- External project links open in a new tab; links to msmr.dev itself don't. Do Day links to its README, because the app itself is private.
- Colours follow the system's light or dark mode.
- Images load only when a card is first touched or hovered, and fonts come from this site, not from Google.
- On touch screens, the card on screen fills with its colour once it snaps into place.
- Motion respects `prefers-reduced-motion`.
- Without JavaScript the page still reads top to bottom, with a small static wordmark.
