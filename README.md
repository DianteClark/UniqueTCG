# Plebes — The Poker Trading Card Game

**Play it live: https://dianteclark.github.io/UniqueTCG/**

A pixel-art trading card game built from a standard 52-card deck. Number cards are troops, face cards are heroes, your Ace is your castle, and the five cards on your board form a poker hand that powers up your army. You can bluff, too.

## How it plays
- **Goal:** destroy the enemy castle (30 health). Your Ace is your leader and has a once-per-game power.
- **Crowns:** start at 1 and gain +1 each turn, up to 6. Cards 2–4 cost 1, 5–7 cost 2, 8–10 cost 3; Jack 3, Queen 4, King 5.
- **Starting a match:** a coin toss decides who picks; the winner chooses to go first or second (second gets 1 bonus Coin). Both players may then swap up to 3 cards from their starting hand.
- **Each turn:** draw 1, optionally **muck** (discard up to 2 and draw that many), play cards, then end your turn. Each troop attacks the card across from it, or the castle if the lane is empty. New troops are ready next turn.
- **Health = the card's number.** Lower numbers hit harder for their cost.
- **Board poker hands:** Pair, Two Pair, Three of a Kind, Straight, Flush, Full House, Four of a Kind, Straight Flush, Royal Flush (instant win). Each gives a bonus.
- **Targets:** Bribe, Last Rites and Graft pick their target when played; a Duelist can be aimed.
- **Truth & Lies:** once per turn, play any card face-down and declare it as a number card. Your opponent can pay 1 Crown to call it. A lie is destroyed. If you told the truth, the caller takes 3. The TRUE Joker exposes every hidden enemy card. The FALSE Joker is wild and can never be called.

## Kingdoms
| Kingdom | Suit | Trait |
|---|---|---|
| Heartsbane | Hearts | Blood Price: pay castle health for attack. Heroes return Bloodless. |
| Portent Sound | Diamonds | Tithe: Coins, bribes and taxes. |
| Mt. Falstaff | Spades | Buried: hurts the enemy castle when destroyed. |
| Cyrus Glen | Clubs | Grow: bigger every turn. |
| United Falls | United (fist) | United: stronger together. Unlocked by finishing the campaign. |

## Modes
- **Campaign:** 7 stages per kingdom (troop ranks, Jack, Queen, King, Ace boss with a twist). Clear all four to unlock United Falls. Hard mode after that.
- **Skirmish:** quick games against the computer at three difficulty levels.
- **Draft:** pick a leader and 12 cards, then play until 3 wins or 2 losses for packs.
- **Duel:** play a friend by 6-letter invite code, browser to browser (WebRTC via PeerJS). Add `?local` to the URL to test with two tabs in one browser.
- **Tutorial:** a guided first match that teaches playing cards, combat, poker hands, calling bluffs and Ace powers.
- **Bosses:** every campaign Jack, Queen, King and Ace has a name, lines of dialogue and a signature Animated card.
- **Daily quests:** three new quests each day, tracked in every mode.
- **Crafting & deck codes:** craft any card with gold; share and import decks with `PLB1.` codes.
- **Install:** add it to your home screen; it works offline after the first visit (manifest + service worker).
- **Packs & collection:** 5-card packs with Origin, Classic and Animated hero/Ace/Joker versions and cosmetic foils. Max 3 of each troop, 1 of each hero/Joker version per deck.

## Project layout
```
index.html          app shell
css/style.css       all styles
js/engine.js        rules engine (pure, also runs in Node)
js/ai.js            computer opponent
js/data.js          profile, packs, campaign, draft (localStorage)
js/net.js           peer-to-peer duels
js/sfx.js           synthesized sound effects (no audio files)
js/ui.js            screens and battle UI
assets/             card sheets, animation strips, fonts, GUI pieces
```
No build step. Serve the folder with any static server, e.g. `python3 -m http.server`.

## Credits
Card art: **Pixel Plebes** animated digital playing cards by **Devlyn JD** (2018–2024), including the United Falls suit, Bloodless Hearts and the Classic deck. Used with credit, as the artist requests.

Interface art: **Pocket GUI** by **Vreyll** (window frames, buttons, icons, cursor, phone frame). Only the cropped pieces used by the game are included, not the original asset sheets.
