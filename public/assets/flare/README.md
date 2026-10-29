# Flare artwork used in this game

Official source: https://github.com/flareteam/flare-game
Pinned source revision: `af6eee6d339ac98011864bfe89da837fe7769c28`.
Project: https://flarerpg.org/

These are selected artwork files and local adaptations from Flare: Empyrean Campaign.
The Flare engine is not included or used. The project's existing React/Phaser engine remains in place.

## License and attribution

Flare artwork and these adapted sheets are distributed under **CC BY-SA 3.0**
(or a later version permitted by the original project):
https://creativecommons.org/licenses/by-sa/3.0/

Copyright © Clint Bellanger and the original contributing artists. Keep this
notice, `LICENSE.txt`, `CREDITS.txt`, and `CREDITS-per-file.md` with the artwork.
`CREDITS-per-file.md` is a copy of the official per-file credits wiki, retrieved
2026-10-29 from https://github.com/flareteam/flare-game/wiki/Credits .
The art license applies to the art and its adaptations; no Flare engine code was imported.

## Character sources and adaptations

Original root: `mods/fantasycore/` in the pinned source repository.
Each PNG is decoded with its corresponding `animations/*.txt` crop and foot offsets.

- `characters/hero-*.png`: `images/avatar/male/` plate cuirass, greaves, boots,
  gauntlets, helm, short-haired head, longsword and shield. Layer order follows
  official `hero_layers.txt` for each of the eight directions.
- `characters/grunt-*.png`: `images/enemies/skeleton.png`.
- `characters/runner-*.png`: `images/enemies/goblin.png`.
- `characters/ranged-*.png`: `images/enemies/skeleton_mage.png`; its ranged attack
  uses the author's cast animation.
- `characters/brute-*.png`: `images/enemies/minotaur/minotaur_*.png`.
- `characters/boss-*.png`: `images/enemies/wyvern/wyvern_*.png`.
- `characters/restoration.png`: `images/npcs/return_obelisk1.png`.

Changes: packed crops are repacked onto consistent transparent cells, the hero's
layers are composited, and all art is downsampled with Lanczos filtering. No
character pixels were newly drawn, no directions are synthesized or mirrored.
The output grid retains Flare's logical rows: SW, W, NW, N, NE, E, SE, S. On
screen those correspond to W, NW, N, NE, E, SE, S, SW respectively because Flare
normally projects its logical coordinates isometrically. Our screen-plane
simulation maps those screen directions to the original rows, without rotating
the composited layers again. Frames run left to right. `characters/manifest.json` records dimensions,
foot anchors and timing. Melee playback is synchronized to the game's contact
window rather than changing game rules to match a sheet's default speed.

Reproduction (Pillow is an offline art-tool dependency, not a game dependency):

```sh
python3 scripts/importFlareCharacters.py --source-root /path/to/flare-game
```

See `environment/README.md` for tile and scenery sources and transformations.
