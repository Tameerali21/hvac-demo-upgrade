# Never Miss a Customer — HVAC demo (Solstice Heating & Air)

Demo sales assistant for HVAC businesses, hosted by **Aria**. Static HTML/CSS/JS — works from `file://`, zero external requests.

## The fictional business

- **Name:** Solstice Heating & Air (verified fictional — no real HVAC company with this name found via public web search on 2026-09-29; the name collides only with a Midea AC *product line* and an Australian energy program, not a service contractor)
- **City:** Phoenix, AZ
- **Tagline:** Heating · Cooling · 24/7
- **Address:** 4208 E Cactus Rd, Phoenix, AZ 85032 (fictional)
- **Phone:** (602) 555-0164 (fictional 555 range)

Do NOT reuse for a real business without replacing name/phone/address.

## Run

```bash
# zero build step — just open it
xdg-open index.html
# or serve locally
python3 -m http.server 8080
```

## Personalize per prospect

```
index.html?biz=Their+Name&tagline=Their+Tagline&city=City,+ST&address=123+Main+St&phone=(555)+123-4567
```

`?biz=` also drives the booking reference prefix (e.g. "Desert & Pine Air" → DP-4821).
`?tagline=` replaces the nav tagline; `?city=` replaces the eyebrow, hero copy, footer,
and the widget's location answer (no hardcoded-Phoenix leaks). `?services=` (max 8) and
`?hours=` (max 6, chat-with-Aria row preserved) swap the services grid / hours table.
All injected values are HTML-escaped.

## The four flows (Aria)

1. **Services / pricing Q&A** — AC repair ($89 diagnostic, waived with repair), system replacement (from $4,900, 10-yr warranty), tune-up ($129), Comfort Club ($18/mo), duct cleaning (from $249), IAQ (free assessment), heat pumps, smart thermostats.
2. **Service booking** — visit reason → name → phone (optional, validated) → day → time → confirmation card with `SH-XXXX` reference.
3. **Emergency / after-hours lead capture** — 11:42 PM notice, issue chips, urgency flag (`HIGH — no cooling` vs `Priority`), name + phone (validated), saved lead + owner dashboard card. Money line: *"every midnight breakdown becomes a morning dispatch, not a customer lost to the company with the 24/7 line."*
4. **Free quote estimator** — home size → system age → intent → ballpark range, with a nudge to the free in-home quote.
5. **Review request** — 5★ → Google review button; 1–4 → private feedback saved, "service manager will personally follow up".

Leads persist in `localStorage` under `nmc_hvac_leads` (the "Saved to your dashboard"
card is real). Honest "How it works" section (no invented testimonials or review
counts) + OG/Twitter link-preview tags. Chat router matches keywords at word starts
only ("anywhere" ≠ "where", "recall" ≠ "call").

## Test

```bash
NODE_PATH=/tmp/hvac-verify/node_modules node ~/workspace/outreach/demo-deploy-zips/hvac-verify-2026-10-04.js   # puppeteer harness, 65 checks — must be 65/65
```

Test hooks: `?fast=1` (no typing delays) + `window.__maya` (`open`, `say`, `state`, `clearLeads`).

## Deploy

Zip the folder (`solstice-hvac-deploy.zip`) → Netlify drag-and-drop as a new site (suggested name `solstice-hvac-demo`) → verify HTTP 200, title, public access. Do NOT deploy to the salon/restaurant site — always a fresh site per niche.
