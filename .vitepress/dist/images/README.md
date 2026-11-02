# Xila deployment artwork

The editable masters and export tooling live in [xila-project/brand](https://github.com/xila-project/brand).

Imported revision: `a7f0b4441c2328935d92970a585cdfe999f0537e` (Continuity, identity version `1.1.0`).

| File             | Use                                                         |
| ---------------- | ----------------------------------------------------------- |
| `logo_light.svg` | Black symbol for light backgrounds                          |
| `logo_dark.svg`  | White symbol for dark backgrounds                           |
| `logo_dark.png`  | White raster compatibility export                           |
| `favicon.svg`    | Ink symbol on a light tile, visible in either browser theme |

These are local deployment copies. Preserve their public paths: external README files also reference them. Original artwork is archived with provenance in the brand repository.

To update them, use a checkout of the reviewed brand revision:

```sh
python /path/to/brand/scripts/sync_website.py /path/to/website
cp /path/to/brand/assets/favicon/favicon.svg /path/to/website/src/public/images/favicon.svg
```

Record the imported commit here, format changed text files, and run `npm run check` in the website checkout. Edit the master in brand rather than changing these copies. Website builds require no access to the brand repository.
