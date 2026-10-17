# Bee Factory: game design

A cute gacha game about bees. You build hives that make honey, open packs to recruit bees from around the world, train them, and lead teams of up to six through a turn-based story (Brave Frontier style). There's also a real-time PvP arena.

**Design pillars**
1. **Cute and readable.** Round bees, bright colours, one accessory each. You should be able to tell bees apart without reading anything.
2. **Icons first, very little text.** Every resource, stat, element and status has an icon and a colour. No emoji: game icons are drawn as SVG in the bee art style (`src/art/GameIcon.tsx`), and generic UI icons come from the open-source Lucide set (ISC license). Numbers pop out of the action. Text is only for names and lore.
3. **Easy to learn, with depth for those who want it.** Tap a bee to attack. When its gauge is full, swipe up to Burst. That's the whole tutorial. Team synergies, elements and statuses are optional depth.
4. **Rarer bees feel rarer.** Rarity shows up in the idle animation, the aura, the summon reveal and the Burst effects.

---

## 1. Lore (short)

Every flower in the world is fed by the **Great Comb**, a giant golden hive hidden under the roots of the oldest tree on Earth. Its keeper, **Queen Melissa**, sends bees from every country to keep the world in bloom.

One spring, the flowers start turning grey. A cold fog called **the Wilt** drifts across the meadows and drains colour and nectar wherever it goes. The wasps, hornets and beetles that breathe it turn into *Wilted* creatures, grey with glowing violet eyes, and they obey a single voice: **Vespero, the Hollow King**, a hornet who once tried to steal the Great Comb.

Melissa can't leave the Comb, so she wakes up an old, forgotten factory: the **Bee Factory**. Its job is to recruit bees from every land, build hives and push the Wilt back one meadow at a time. The first bee to show up for work is a small, clumsy worker in a hard hat: **Pip**.

**Story arc**
| Act | Where | What happens |
| --- | --- | --- |
| I | Home Meadow | Pip and you reopen the Factory. First hive, first pack, first wasps. |
| II | Earth, one country per chapter | Free each country's flower field and recruit its bees. Each chapter ends on a Wilted boss. |
| III | The Moon | The Wilt comes from the dark side of the Moon. Moon bees, silver and quiet, join you. |
| IV | Mars and the planets | Vespero's comet trail runs from planet to planet. |
| V | The Sun | The last battle. Sun bees are pure light. Vespero is a hornet who wanted to be warm. You beat him, the Wilt lifts, and Vespero becomes a (grumpy) recruitable bee. |

Lore is told through short wordless cutscenes (two or three panels) and a one-line caption at most.

---

## 2. Mascot: Pip

> **Pip, the Factory's first worker bee.**

- A small, round yellow bee with chunky brown stripes and big shiny eyes. Their wings are always a little crumpled.
- Wears a **yellow hard hat with a tiny lamp** that's slightly too big and tips over their eyes when they're surprised. It ties into the "factory" name and doubles as a light in the dark (Moon chapters).
- Holds a **honey dipper** as a magic wand and weapon.
- Personality: brave, clumsy and always busy. They're the guide in menus (pointing at what to tap) and the app icon.
- In game, Pip is the **free starting bee** (Common, Light element, Support). They can't be pulled from packs but **evolve with the story** (hard hat → miner lamp → astronaut helmet on the Moon → solar crown), so the mascot stays useful to the end.

---

## 3. Resources

| Resource | Icon | Colour | Source | Used for |
| --- | --- | --- | --- | --- |
| **Honey** | honey drop / jar | warm gold `#F5B301` | hives (idle, over time), some stage rewards | packs, hive upgrades, crafting consumables |
| **Silver** | shiny silver coin with a bee | silver `#C9D3DD` + white glint | stage rewards, arena, selling duplicates, daily tasks | packs, leveling, hive building |
| **Pollen** | yellow-green ball | `#C7E04A` | stages | experience for bees (feed it to level up) |
| **Royal Jelly** | pink-white jar | `#F7C9E0` | rare: first clears, boss rewards, achievements | premium packs, revive consumable, star-up |

Honey is gold, so **silver** is the money, as you asked. No real-money currency is planned. If one is ever added, it would be Royal Jelly.

### Hives (farming)
- Hives fill with honey over time, offline included (up to a storage cap). Tap a hive to collect, with a satisfying drip animation.
- Hive types unlock with progress: **Straw Skep** → **Wooden Box** → **Clay Pot** → **Crystal Comb** → **Moon Comb** → **Sun Comb**. Upgrades raise output and storage.
- **Bee utilities:** every bee has a **Work** stat and one utility perk. Assign up to 3 bees to a hive as workers. Example perks: "+20% honey", "+storage", "chance of Royal Jelly", "makes Pollen". Bees on hive duty can still fight, so you never have to choose. This gives weak but cute Common bees a long-term purpose.
- **Kitchen:** craft consumables from honey and silver.

---

## 4. Bees

### Rarity
| Tier | Name | Colour | Stars | Visual signature |
| --- | --- | --- | --- | --- |
| 1 | Common | grey `#9AA5B1` | 1 star | none |
| 2 | Uncommon | green `#3DBE6A` | 2 stars | soft glow |
| 3 | Rare | blue `#3B8BF0` | 3 stars | sparkles |
| 4 | Epic | purple `#9B5DE5` | 4 stars | pulsing aura + orbiting motes |
| 5 | Legendary | orange-red `#FF6B3D` | 5 stars | flame halo, trail particles, unique Burst cutscene |
| 6 | Mythic | prismatic (rainbow) | 6 stars | rainbow shimmer, full-screen Burst |
| 7 | Celestial | deep blue + stars `#1B2A6B` | moon mark | starfield inside the body; Moon, planet and Sun bees only |

Legendary is orange-red rather than gold so it doesn't clash with honey.

### Stats
Icons only in the UI:
- **HP** (heart): health.
- **ATK** (stinger): damage.
- **DEF** (shield): damage taken is reduced.
- **REC** (flower): healing power, and the strength of heals the bee receives.
- **SPD** (wing): order within the enemy phase, and dodge chance.
- **WORK** (hammer): hive production.

Each bee also has:
- **Element:** Flame, Leaf, Storm, Wave, Light, Shadow, each with its own drawn icon. The cycle is Flame > Leaf > Storm > Wave > Flame, and Light and Shadow are each strong against the other. Strong hits deal ×1.5, weak hits ×0.75.
- **Role:** Guardian (tank, taunts), Striker (damage), Healer, Support (buffs) or Trickster (statuses). Shown as a small badge.
- **Attack:** the normal tap attack (number of hits, gauge gain).
- **Buzz Burst:** a special move, used when the gauge is full.
- **Utility perk:** the hive bonus.

### Progression
- **Level** with Pollen and Silver. Level cap depends on rarity (Common 20 → Celestial 100).
- **Duplicates** raise **Star Rank** (+stats, +Burst power, up to 5 extra stars on top of rarity) or can be sold for Silver.
- **Evolution** (later): some bees evolve into a higher-rarity form with a new accessory.

### Look (how bees are told apart)
Every bee is the same simple round sprite, drawn in code as SVG, with:
- a **body colour** and **stripe colour**,
- **wing tint**,
- **one hat or headpiece** and **one held item** from its zone,
- the **rarity aura**.

That gives a lot of variety while keeping one consistent, cute shape.

---

## 5. Zones (collections)

Each **zone** is a real-world country with its own pack. Bees from a zone share an accessory style and a palette, and get a team synergy.

| Zone | Continent | Palette | Accessory ideas | Field (story chapter) |
| --- | --- | --- | --- | --- |
| France | Europe | blue, white, red, lavender | beret, Breton stripes, baguette, musketeer hat, chef's whisk | Lavender Fields |
| Germany | Europe | black, red, gold, forest green | Tyrolean feather hat, pretzel, clockwork goggles, knight helm | Black Forest |
| Italy | Europe | green, white, red, lemon | chef hat, gondolier straw hat, Venetian mask, Roman helmet | Lemon Coast |
| Japan | Asia | white, red, sakura pink | hachimaki headband, kitsune mask, sakura pin, samurai kabuto, paper fan | Sakura Mountains |
| India | Asia | saffron, green, peacock blue | marigold garland, lotus crown, peacock feather, tea cup | Lotus Valley |
| Egypt | Africa | sand, turquoise, gold | nemes headdress, ankh staff, scarab, papyrus | Nile Delta |
| Brazil | Americas | green, yellow, blue | carnival feather crown, football, toucan friend | Amazon Canopy |
| USA | Americas | red, white, blue | cowboy hat, baseball cap, astronaut helmet (foreshadows the Moon) | Prairie & Cape |
| *Later:* UK, Spain, Mexico, China, Korea, Kenya, Australia, Canada, Greece, Morocco, Nordic... | | | | |
| **Moon** | Space | silver, pale blue | crater helmet, moon-rock shield | Sea of Tranquility |
| **Mars, Saturn...** | Space | rust, ring gold | ring halo, rover arm | Red Plains |
| **Sun** | Space | white-gold, coral | solar crown, flare cape | The Corona |

### Packs (gacha)
| Pack | Pool | Cost | Notes |
| --- | --- | --- | --- |
| **Country pack** | one zone | Honey **or** Silver | the main pack; unlocks when that chapter starts |
| **Continent pack** | every zone of a continent | Honey **+** Silver | better Epic rate |
| **World pack** | every Earth zone | Honey + Silver + Royal Jelly | guaranteed Rare or better |
| **Cosmic pack** | Moon, planets, Sun | Royal Jelly + lots of Honey | late game; only pack with Celestials |
| **×10 pull** | any pack | ×10 price | guaranteed Epic or better |

Base drop rates (Earth packs): Common 50%, Uncommon 28%, Rare 15%, Epic 5.5%, Legendary 1.3%, Mythic 0.2%.
**Pity:** a guaranteed Legendary after 80 pulls without one, counted per pack family.
Every pack shows its rates and full bee list behind an "i" button.

**Pack opening:** a honeycomb cell wobbles, cracks and pours light in the colour of the best bee inside. That colour builds anticipation. Legendary and up adds a short flight cutscene.

---

## 6. Teams and synergies

- A team has up to **6 bees**, and **the same bee can't be used twice**.
- **Zone synergy** (counted per zone):
  - 2 bees: small bonus (e.g. France +8% REC, Japan +8% SPD, Germany +8% DEF, Italy +8% HP, Brazil +8% ATK, USA +8% gauge gain, Egypt +8% crit, India +8% status chance)
  - 3 bees: the bonus doubles
  - 4 bees: the bonus doubles, plus a zone passive (e.g. France: heal 3% HP each turn)
  - 6 bees: **Homeland bonus**, a large boost (all stats +15%) and a unique team aura animation
- **Continent synergy:** 3 or more bees from the same continent give +5% HP.
- Mixed teams stack: 2 France + 2 Japan + 2 Brazil activates three small bonuses.
- The team screen shows active synergies as glowing zone flags with dots (●●○○), so they're readable without text.

---

## 7. Combat (turn-based, Brave Frontier style)

**Layout:** your bees on the left in a 2×3 formation, enemies on the right. Party HP and gauge bars sit at the bottom.

**Your turn**
- **Tap a bee:** it flies over and attacks the selected target (tap an enemy to change targets).
- **Swipe up on a bee, or tap it when its gauge glows:** **Buzz Burst**.
- Bees act in the order you tap them. **Chaining** attacks on the same target in one turn raises a combo multiplier (+10% per hit in the chain), which rewards tapping quickly in a smart order.
- **Items:** a bar of up to 4 consumable slots. Using one doesn't take a bee's action.
- When every bee has acted (or you tap end turn), the **enemy phase** starts.

**Enemy turn:** enemies act in SPD order. Bosses **telegraph** big moves one turn ahead (glowing red outline + icon), so you can shield or heal.

**Gauge:** fills when you deal damage, take hits and break enemies. Each bee has a gauge size (bigger Bursts need more).

**Statuses (icons only):** Poison (green bubbles), Burn (flame), Stun (stars), Weaken (broken stinger, ATK down), Guard (shield, DEF up), Fury (ATK up), Regen (leaf, heal over time), Taunt (target pulls hits).

**Consumables:**
| Item | Effect |
| --- | --- |
| Honey Drop | heal one bee 40% |
| Honey Jar | heal the whole team 25% |
| Mint Leaf | cure all statuses on one bee |
| Royal Jelly | revive a fainted bee at 50% HP |
| Buzz Candy | fill one bee's gauge |

**Stages:** most stages have **2-4 waves**. HP and statuses carry over between waves. The last stage of each chapter (and some mid-chapter ones) has a **boss wave**. The rewards screen shows a chest that pops open with Silver, Pollen, Honey, sometimes Royal Jelly, plus first-clear bonuses and a 1-3 star rating (no bee fainted, cleared within N turns).

**Energy:** the first version has no stamina system, so you can play as much as you like. Rewards for replaying a stage decrease each day to limit farming.

---

## 8. PvP Arena (real time)

- Only PvP: there's no co-op adventure or shared farming.
- **Real-time duels:** both players plan their turn simultaneously within a **15 s timer** (tap order, targets, Bursts). The turns then resolve together with the same animations as the story.
- Peer-to-peer (WebRTC). In the first version you play against a friend with a room code. Random matchmaking and a ranked ladder (Bronze → Royal) need a small matchmaking server, which comes later.
- Fairness: levels are normalized in the arena (every bee at its rarity's reference level), so collection matters but grinding doesn't.
- Rewards: Silver and arena badges (cosmetic).

---

## 9. Audio

- **Menus, hive, collection:** chill lo-fi garden music (soft keys, light percussion, bird and buzz ambience).
- **Combat music adapts to the fight.** One combat theme is split into stems that fade in and out:
  - *Normal fight:* drums + bass + lead.
  - *Team in danger* (average HP < 35%): the tempo rises and a tense string or arp layer comes in.
  - *Boss wave:* a separate epic boss theme with choir pads and big drums.
  - *Celestial / final boss:* the boss theme plus an orchestral layer.
  - *Victory sting* and *defeat sting.*
- The first version generates this music in code (Web Audio synthesizer), so there are no licensing issues and it adapts in real time. It can later be replaced with recorded stems (composer or royalty-free) using the same adaptive layer logic.
- Volume sliders for music and effects, plus a mute button, in a one-screen settings page.

---

## 10. Animations

| Rarity | Idle | Attack | Burst |
| --- | --- | --- | --- |
| Common/Uncommon | bob + wing flap | dash + sting, small spark | bigger hit, coloured flash |
| Rare | + sparkles | + hit trail | short charge-up, element particles |
| Epic | + aura pulse, orbiting motes | + afterimage | screen tint, multi-hit with particles |
| Legendary | + flame halo, particle trail | + screen shake | close-up cutscene (0.8 s), element blast across the screen |
| Mythic | + rainbow shimmer | + prismatic trail | full-screen rainbow burst, slow-motion |
| Celestial | + starfield body | + comet trail | cosmic background takeover |

Damage numbers pop and bounce. Crits are bigger and coloured, and element advantage shows an arrow. Enemies shrink and puff into grey fog when defeated, and the fog then turns into flower petals (the Wilt lifting).

---

## 11. Platforms

- **Web (PC and phone):** one responsive web app. Landscape layout on PC, portrait layout on phone. Installable as a PWA.
- **Android app:** the same code packaged with **Capacitor** into an APK. GitHub Actions builds it and attaches it to each release.
- **Download on the website:** on an Android phone, the site shows a "Get the app" banner linking to the latest APK. Other phones get "Add to home screen" instructions.
- **Saves:** local (browser or app storage), with export and import of a save code. Cloud save can come later.

---

## 12. UX rules

- Big tap targets (≥ 48 px), thumb-reachable bottom navigation on phone: **Hive · Summon · Team · Story · Arena**.
- Resource bar always visible at the top (honey, silver, pollen, royal jelly).
- Red dots on tabs when something is ready (honey to collect, a free pack, a new chapter).
- No walls of text. Explanations are a single icon + number tooltip, or Pip pointing at something.
- Every tap gives feedback: a squish animation and a soft "bzz" click.
