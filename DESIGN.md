# Design brief

Recon: dark, warm and calm, after the references in `inspi/` (a red-lit AI app, a dark sports
tracker, a nutrition tracker, a smart camera shop). Kept from them: near-black surfaces, big rounded
cards with a hairline border, pill buttons with the arrow in a separate circle, a floating pill tab
bar, a segmented switch, small uppercase captions, a warm red glow in a corner, one underlined word.

- Type: Outfit (variable), sentence case. Clock 48, title 30, skin name 22, body 15, caption 12.
- Colour (`ui/Theme.kt`): ink #101010, panel #1B1B1B, raised #282828, rule #2E2E2E, bone #F3F0EA,
  mute #8F8B85, ember #E8492F. Ember is the only accent: wishlist hits, errors, the logo ping.
  Skin cards glow in their tier colour, which comes from the game data.
- Motion only where it explains something: press feedback, tab fade, banner slide, skeletons while
  loading, store content fading in. No idle animation.
- Copy: no server, region or HTTP wording in the app; errors go through `friendly()` in `Api.kt`.
- Empty states show what will be there (four dashed daily slots, quick-add lines), never a blank.
- Logo: a ping, an ember dot with a ring and an open ring; `docs/logo.svg`.
