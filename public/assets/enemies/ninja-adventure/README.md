# Ninja Adventure enemy artwork

Authors: **Pixel-Boy and AAA**. License: **CC0 1.0 Universal**.

- Official pack and license statement: https://pixel-boy.itch.io/ninja-adventure-asset-pack
- Downloaded 2026-10-29 through the author's free download, without payment or an account.
- Archive: `Ninja Adventure - Asset Pack.zip`, upload 16981275 (March 2026 update).
- Original license is preserved in `LICENSE.txt`; original author readme in `AUTHOR-README.md`.

Only this small animation subset is redistributed:

| Role | Original path within the pack | Runtime file |
| --- | --- | --- |
| Grunt | `Actor/Monster/Mushroom/mushroom.png` | `mushroom.png` |
| Runner | `Actor/Monster/BlueBat/SpriteSheet.png` | `bat.png` |
| Ranged | `Actor/Monster/LanternRed/SpriteSheet.png` | `lantern.png` |
| Brute | `Actor/Monster/Bear/SpriteSheet.png` | `bear.png` |
| Boss | `Actor/Boss/GiantBlueSamurai/{Idle,Walk,Hit,ChargeLeft,ChargeRight,AttackLeft,AttackRight}.png` | `boss-*.png` |

Monster PNGs are unchanged 16x16-frame sheets, four animation frames in each of
four directions. Mushroom, bat and lantern columns are down/up/left/right;
Bear uses down/left/up/right. Idle and movement use the author's actual frames.
These monsters do **not** include a separate sword attack or hurt animation.
During attacks the game reuses their movement animation, adds a short windup
pose/lunge and retains the existing directional/area attack telegraphs.
Damage feedback uses a brief tint; this is not presented as a custom slash sheet.

The boss includes actual idle, walk, hit, charge and sword swing animations.
It is a front-facing boss: source left/right variants select the striking blade;
there are no separate back-facing boss frames. Its source idle/walk/hit cells are
96x48; transparent 24-pixel padding above and below normalizes them to 96x96 to
keep a stable foot origin when switching to the 96x96 charge/attack sheets.
No pixels were redrawn. Source colors are preserved, and runtime scaling uses
nearest-neighbor filtering. Combat radii, damage and AI are unchanged by this art.
