# Design brief

Concept: an online store for four items that change every day. The product is the hero: the skin
art is large, lit by its own tier colour, and sits on an oversized version of its name. Everything
else is ink and bone so the products carry the colour.

## What the references showed
Seen as screenshots on Dribbble (visual access, 2026-10-19):
- Dark e-commerce apps (sleek.design, "Dark Premium Tech Gadget Store"): bordered dark cards, a big
  centred product, the name and the price at the bottom, the price in a pill of the accent colour,
  selected category chips filled.
- Luxury fashion app (SM Rubel): a huge word behind the product, partly hidden by it, for depth; a
  soft coloured glow behind the product; large tight headings.
- Light shops (Purrweb, Pixelean): product on a tinted card, lots of air. Not used: this app is dark.
Not copied: layouts, art, copy. The tier colours are the game's own (valorant-api.com).

## AI slop check
Defaults named by the sources read (purple/indigo gradients, Inter, a centred hero with three icon
cards, rounded corners everywhere, soft shadows, placeholder names) and what was done instead:
- Type: Barlow Condensed uppercase for display, Barlow for body. Not Inter or Roboto.
- Colour: no brand accent. Colour comes from the data (tier colours), never from decoration.
- Shape: one cut-corner shape, no rounding, no shadows. The glow is a flat radial tint of the
  tier colour, which tells you the rarity, not a decorative gradient.
- Content: real skins, real prices, errors and empty states written for this product.

## Typography
- Barlow Condensed SemiBold, uppercase, tracked: clock, titles, skin names, labels.
- Barlow Regular 15sp / 22sp: body and form text.
- Scale: 104 giant word, 56 clock, 28 skin name, 24 title, 15 body, 13 label.

## Color (dark only, tokens in `ui/Theme.kt`)
| token | hex | use |
|---|---|---|
| ink | #0E1116 | background |
| panel | #161B22 | cards, rows |
| rule | #2B323C | 1dp borders |
| bone | #E9E4DA | text, primary button, selected |
| mute | #98A1AC | secondary text |
| danger | #F0614F | errors only |
Tier colours (Select, Deluxe, Premium, Ultra, Exclusive) come from the API. Ink text on a tier
colour is used for the price pill; contrast is above 4.5 for all five.

## Shape and layout
- Rectangle with two opposite corners cut at 45 degrees (the logo's shape), 1dp rule borders.
- A wishlist hit: 2dp bone border and an inverted WISHLIST tag, the loudest thing on screen.
- Bottom bar with three tabs (Store, Wishlist, Setup); it hides while the keyboard is open.
- 48dp minimum touch targets, labels and content descriptions on every icon button.

## Logo
Four daily offers in a 2x2 grid, one filled: the wishlist hit. Same cut corners as the UI.
Adaptive icon with a monochrome layer. Source: `docs/logo.svg`.
