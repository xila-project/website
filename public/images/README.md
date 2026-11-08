# Xila deployment artwork

The editable masters and export tooling live in [xila-project/brand](https://github.com/xila-project/brand).

Imported revision: `a9e95e72a1eca6d9b2d0f577095f4aebba721f14` (Monogram, identity version `2.0.0`).

| File             | Use                                                         |
| ---------------- | ----------------------------------------------------------- |
| `logo_light.svg` | Black symbol for light backgrounds                          |
| `logo_dark.svg`  | White symbol for dark backgrounds                           |
| `logo_dark.png`  | White raster compatibility export                           |
| `favicon.svg`    | Ink symbol on a light tile, visible in either browser theme |

These are local deployment copies. Preserve their public paths: external README files also reference them. Original artwork is archived with provenance in the brand repository.

To update them, run the following from the website repository root with a checkout of the reviewed brand revision. The historical brand sync script targets the former VitePress layout; Astro publishes these files from `public/images/`:

```sh
cp /path/to/brand/integrations/website/images/logo_light.svg public/images/logo_light.svg
cp /path/to/brand/integrations/website/images/logo_dark.svg public/images/logo_dark.svg
cp /path/to/brand/integrations/website/images/logo_dark.png public/images/logo_dark.png
cp /path/to/brand/assets/favicon/favicon.svg public/images/favicon.svg
```

Record the imported commit here, format changed text files, and run `npm run check` in the website checkout. Edit the master in brand rather than changing these copies. Website builds require no access to the brand repository.
