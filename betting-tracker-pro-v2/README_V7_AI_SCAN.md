# AJ Bet Tracker V7 – AI Vision betslip scanner

V7 beholder alle funktioner fra V6/V5 og opgraderer betslip-scanneren.

## Nyt i V7
- AI Vision er førstevalg i stedet for ren OCR.
- Flere screenshots af samme bet kan analyseres samlet.
- AI forsøger at finde kamp, liga, samlet odds og alle ben.
- Overlappende ben på flere screenshots deduplikeres.
- AI skelner mellem fx skud/skud på mål, spiller/hold, over/under, hjørnespark, tacklinger og 1./2. halvleg.
- Sikkerhed og advarsler vises før bettet gemmes.
- Lokal Tesseract OCR bruges automatisk som fallback.

## Vigtigt: aktivér AI Vision én gang i Vercel
API-nøglen må aldrig lægges i app.js eller GitHub.

1. Åbn Vercel → projektet `betting-tracker-pro`.
2. Gå til Settings → Environment Variables.
3. Opret variablen `OPENAI_API_KEY` og indsæt din OpenAI API-nøgle som værdi.
4. Vælg Production (gerne også Preview).
5. Gem variablen og redeploy den seneste deployment.

Valgfrit kan du tilføje `OPENAI_VISION_MODEL`. Standard er `gpt-5.6-terra`.

OpenAI API-forbrug faktureres separat fra et ChatGPT-abonnement.

Hvis `OPENAI_API_KEY` ikke er sat, virker scanneren stadig, men bruger den mindre præcise lokale OCR fra V6.

## Upload til GitHub
Upload alle V7-filer direkte til `betting-tracker-pro-v2`, så `index.html`, `app.js`, `styles.css` osv. erstatter de gamle filer. Upload også mappen `api` med `scan-betslip.js`.

Behold din eksisterende Supabase-konfiguration. V7 kræver ingen databaseændring.
