# Social cards

`og-card.html` is the 1200×630 social card template in the Horizonte language
(Spectral + Jost, the `aohys` wordmark and a lens sphere). `cards.json` defines
one card per page family in Spanish and English; `packages/content-graph`
maps each content id to a card through `SOCIAL_CARD_BY_CONTENT_ID` and serves
`/images/social/card-<key>-<locale>.jpg`.

To regenerate after changing copy or images:

1. Run the site dev server on port 4330 (`pnpm --filter @aohys/site exec astro dev --port 4330 --host 127.0.0.1`).
2. Open Google Chrome with remote debugging on port 9333 (a separate
   `--user-data-dir` is fine).
3. Run `python3 scripts/og/render-cards.py`. It stages the template and fonts
   under `apps/site/public/__og/`, renders every card with `agent-browser`,
   writes JPEGs to `apps/site/public/images/social/` and removes the stage.

Social networks cache previews: after deploying, refresh them with each
network's debugger (for example LinkedIn Post Inspector or the Facebook
Sharing Debugger).
