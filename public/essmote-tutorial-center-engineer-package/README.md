# Essmote Tutorial Center Static Package

This package contains the static help center pages for integration.

## Included Files

- `index.html`: main tutorial center entry page with the left sidebar and CV / PS-SOP tutorial switcher.
- `ps-sop-tutorial.html`: PS / SOP tutorial page embedded by `index.html`.
- `assets/`: images and icons used by the tutorial pages.

Keep these files in the same folder so the relative asset paths continue to work.

## Suggested Integration

Add the folder to the website as a new help or tutorial route, for example:

```text
/help/tutorial-center/
```

Use `index.html` as the main entry page. The PS / SOP page is loaded from `ps-sop-tutorial.html` and should stay beside `index.html`.

## Notes

- The current page is static HTML, CSS, and lightweight JavaScript.
- CTA links that currently use `href="#"` should be replaced with final product routes.
- The layout is designed for a desktop help center view with a left sidebar and right content area.
