# Flare environment artwork

Source: [Flare: Empyrean Campaign](https://github.com/flareteam/flare-game)
Revision: `af6eee6d339ac98011864bfe89da837fe7769c28`.

Original artwork and data: Clint Bellanger and the Flare contributors, including
rubberduck and the additional artists listed in the upstream credits.
License: **CC-BY-SA 3.0** (later versions also permitted by the upstream README).
The Flare code/engine is not included. See the shared Flare license and credits
in the parent folder for the original notices and per-file credit links.

Imported originals:

- `mods/fantasycore/images/tilesets/tileset_grassland.png`
- `mods/fantasycore/images/tilesets/tileset_dungeon.png`
- `mods/fantasycore/images/tilesets/tileset_snowplains.png`
- `mods/fantasycore/tilesetdefs/tileset_{grassland,dungeon,snowplains}.txt`
- `tiled/tilesheets/grassland_trees.png`
- `tiled/tilesheets/snowplains_trees.png`

Local adaptations (also CC-BY-SA 3.0):

- `*-floor.png`: original floor tiles 16–47 cropped using their authored rectangles,
  downsampled from 192×96 to 64×32 and packed into an 8-column atlas.
- `*-props.png`: a small subset of the original props cropped using the authored
  rectangles/ground offsets, downsampled by 0.5 and packed into 256×256 cells.
  The common ground anchor is `(128,224)`. `frames.json` records source tile IDs.
  Circular ground platforms 264/265 are centered on their artwork rather than
  their original multi-tile anchor, so they align with the authored arena center.
- `*-trees.png`: the original 8×2 tree sheet, with 384×768 cells downsampled by 1/3
  and aligned to the same `(128,224)` ground anchor in 256×256 cells.

No art was newly drawn or generated. The isometric diamonds are arranged in the
existing screen-plane world; camera, simulation and collision coordinates remain
unchanged. Low decorative props are visually separate from the small collision
islands listed in each map definition.
