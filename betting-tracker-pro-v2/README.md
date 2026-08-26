# AJ Bet tracker – V2

Ny version med Byg Væddemål / Bet Builder.

## Nyt i V2
- Bettype: Single, Double, Treble, 4-fold, 5-fold+, Systemspil, Byg væddemål
- Et Byg væddemål kan have et valgfrit antal ben
- Hvert ben gemmer marked, kategori, hold/spiller, valg, linje og periode
- Hele Byg væddemålet tæller stadig kun som ét bet i bankroll, ROI og hitrate
- Historik viser benene under det samlede bet
- Analyse viser statistik over hvilke ben/markeder der bruges i vindende/tabende byg væddemål
- Half Win, Half Loss og Void understøttes
- Standardindsats kan sættes som procent af aktuel bankroll
- Flere KPI'er på dashboardet

## Supabase
Hvis din eksisterende database allerede er sat op, kør kun `SUPABASE_UPDATE_V2.sql` én gang i Supabase SQL Editor.

Hvis du starter helt fra bunden, kør `SUPABASE_SETUP.sql` og derefter `SUPABASE_UPDATE_V2.sql`.

Upload derefter filerne til den samme webhosting/GitHub-mappe som den nuværende app. Eksisterende bets bliver bevaret.
