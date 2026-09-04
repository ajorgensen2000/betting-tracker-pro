# AJ Bet tracker – V4

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

## Nyt i V3 – ugemål
- Automatisk ugemål: 2 vundne bets pr. uge
- Kun bets med samlet odds fra 1,50 til 2,00 (inklusive) tæller mod målet
- Ugen går mandag–søndag og nulstilles automatisk
- Dashboard viser antal kvalificerende wins, hvor mange der mangler, ugens samlede P/L, målstreak og succesrate
- 12-ugers graf for kvalificerende wins med mållinje ved 2
- Separat 12-ugers graf for samlet ugentlig profit/tab på alle bets
- Ingen databaseændring er nødvendig til ugemålsfunktionen; den beregnes fra eksisterende bets


## Nyt i V4 – 14-dagesmål i units
- Ugemålet er erstattet af et 14-dagesmål på **+2,80 units**.
- Kun afgjorte bets med samlet odds **1,50–2,00 (inklusive)** påvirker målet.
- Unit-resultat beregnes som bettets profit/tab divideret med indsatsen: vundet odds 1,80 = +0,80u, tabt bet = -1,00u, push/void = 0u.
- Eksempel: +0,80u efterfulgt af -1,00u giver -0,20u, så der mangler +3,00u til 14-dagesmålet på +2,80u.
- Perioderne er faste 14-dagesblokke fra mandag til den anden søndag. Den nye cyklus er forankret i mandag 31-08-2026.
- Dashboard viser aktuelt unit-resultat, manglende units, antal tracked bets, P/L for tracked bets, målstreak og succesrate.
- Grafen viser de seneste 8 14-dagesperioder med mållinje ved +2,80u.
- Separat graf viser samlet profit/tab for alle bets i de samme 14-dagesperioder.
- Ingen databaseændring er nødvendig; funktionen beregnes fra eksisterende bets.
