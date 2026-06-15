# Developer Tycoon Garage Assets

This pack contains the generated PNG assets for the garage tycoon prototype.

Folders:
- `transparent_png/` — background-removed versions intended for direct layering in the game.
- `source_png/` — original generated PNGs.

Use `placement_manifest.json` for suggested initial coordinates and z-indexes.
Use `asset_manifest.json` for source filenames and dimensions.

Recommended implementation:
- Keep existing game logic, hitboxes, analytics, and UI.
- Replace SVG visual objects with positioned PNG layers.
- Keep invisible hitboxes over computer/shelf/developer/floor so interactions remain reliable.
- Swap character image based on state: idle, working, tired, worried, thinking, resting, celebrating.

Notes:
- Coordinates are approximate and should be tuned visually in Codex.
- Transparent versions were automatically background-cleaned from generated PNGs. Inspect edges before shipping.
