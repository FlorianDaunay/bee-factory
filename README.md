# Bee Factory

A cute gacha game about bees. Build hives that make honey, open country packs to recruit bees from around the world, and lead teams of up to six through a turn-based story (Brave Frontier style).

- **Design:** [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) covers the lore, the mascot (Pip), rarities, zones, synergies, combat, economy, audio and platforms.
- **Stack:** Vite + React 18 + TypeScript, Tailwind 3 with the token theme system (`src/themes`), zustand (saved in localStorage), vitest.
- **Art and music are generated in code:** bees and enemies are parametric SVG, and the music is a Web Audio sequencer that adapts to the fight. There are no asset files.

## Run

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # engine, gacha, synergy, hive and balance tests
npm run build      # static site in dist/
```

## Layout

```
src/core/      pure game logic, no React (data, battle engine, gacha, hives, synergies, progression)
src/audio/     synthesized SFX + adaptive music
src/art/       SVG bees, enemies, hives, icons
src/store/     saved game state (zustand persist) and settings
src/features/  one folder per screen (hive, summon, bees, story, battle, arena, settings)
src/themes/    token-based theme system
```

## Deploy

Pushing to `main` builds and deploys to GitHub Pages (`.github/workflows/deploy.yml`). To turn it on: repository **Settings → Pages → Source: GitHub Actions**.
