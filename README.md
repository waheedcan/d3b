# Gravity Gardens

A Phaser 3 pinball game across three worlds with different gravity settings.

## How to Play
- **Hold SPACE** to charge the plunger, **release** to launch the ball
- **A / ← ** — left flipper
- **D / → ** — right flipper
- Hit all targets to clear the level
- 3 lives per level

## Levels
| Level | Gravity | Gimmick |
|-------|---------|---------|
| 1 – Terra Firma | Normal (980) | Standard layout |
| 2 – Float Zone | Low (200) | Floaty, wide bumper spread |
| 3 – Inverted Sky | Negative (−980) | Flippers at top |

## Credits & Attribution
- **Game framework:** [Phaser 3](https://phaser.io) by Photon Storm Ltd — MIT License
- **All graphics:** Procedurally drawn with Phaser Graphics API (no external assets)
- **Font:** System Arial (no external font)
- **Sound:** None
- **Code:** Written for D3 Physics Assignment

## Running Locally
Requires a local HTTP server (ES modules don't run from `file://`):
```bash
npx serve .
```
Then open `http://localhost:3000`
