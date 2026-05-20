# Essmote Tutorial Center Handoff

This folder contains a standalone static prototype for the Essmote help/tutorial center.

## Files

- `index.html`: main tutorial center page.
- `ps-sop-tutorial.html`: PS/SOP tutorial content embedded by `index.html`.
- `paste-to-site-snippet.html`: optional iframe embed example.
- `assets/`: images and icons used by the tutorial pages.

## Recommended Integration

Please add this as a new help/tutorial page instead of replacing or deleting existing website pages.

Suggested route examples:

- `/help`
- `/tutorials`
- `/help/tutorial-center`

The current Essmote website already has a top navigation item named `帮助中心`, so that link can point to the new route.

## Integration Options

Option A: fast static integration

- Copy this folder into the website's public/static assets area.
- Serve `index.html` as a standalone page.
- Keep `assets/` beside the HTML files so relative image paths continue to work.

Option B: iframe integration

- Host this folder as static files.
- Embed `index.html` inside the existing site layout with an iframe.
- Use `paste-to-site-snippet.html` only as a reference.

Option C: native app integration

- Convert the HTML/CSS into the website's existing framework components.
- Keep the existing page structure and asset paths as visual reference.
- Replace placeholder CTA links with production routes.

## Layout Notes

- The design is intended to be fairly wide on desktop.
- Please avoid placing it inside a narrow content column.
- Recommended desktop content width: around `1360px` to `1440px`.
- If the website has its own header, keep this page below the header and avoid nesting it inside another card.

## CTA Links To Replace

The current prototype still contains placeholder links. Please replace them during integration:

- `开始写文书`
- `开始人工润色`
- CV tutorial navigation buttons if a routed implementation is preferred.

## Privacy Note

This handoff package uses relative file paths only. It should not expose local computer paths or user names.
