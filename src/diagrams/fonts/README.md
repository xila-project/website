# Diagram measurement fonts

The D2 layout engine measures label text with these four fonts, so that the
boxes fit the Montserrat text of the site. The rendered pages do not use the
files: the site stylesheet draws the labels with the Montserrat web font of
`public/fonts/`.

Each file is a static instance of the variable font `public/fonts/Montserrat-normal.woff2`
(or `Montserrat-italic.woff2` for the italic file), reduced to Basic Latin,
Latin-1 and a few punctuation marks, without hinting and without kerning.
The SIL Open Font License of `public/fonts/OFL.txt` applies.

Generate the files again with `fontTools` (Python):

```sh
python3 - <<'PYTHON'
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

instances = [
    ("regular", "Montserrat-normal", 400),
    ("semibold", "Montserrat-normal", 600),
    ("bold", "Montserrat-normal", 700),
    ("italic", "Montserrat-italic", 400),
]
for name, source, weight in instances:
    font = TTFont(f"public/fonts/{source}.woff2")
    static = instancer.instantiateVariableFont(font, {"wght": weight})
    static.flavor = None
    static.save(f"scratch-{name}.ttf")
PYTHON
for name in regular semibold bold italic; do
  python3 -m fontTools.subset "scratch-$name.ttf" \
    --unicodes="U+0020-007E,U+00A0-00FF,U+2018,U+2019,U+201C,U+201D,U+2026,U+2192" \
    --layout-features='' --no-hinting \
    --output-file="src/diagrams/fonts/Montserrat-$name.ttf"
done
```
