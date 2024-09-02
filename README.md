Pokretanje: `node index.js`

`config.js` sadrži parametre korišćene kod `index.js` prilikom simuliranja i mogu se menjati.

Program nije testiran van parametara koji su već podešeni za 1:1 simulaciju:
- Generisanje mečeva u grupnoj fazi zavisi od `config.js`. Nema provere za typo/nepostojeće timove
- Egzibicioni mečevi nisu bili modifikovani ali imaju uticaj na formu tima
- Klase `RoundRobinFormat` i `SingleEliminationFormat` podržavaju više od 12/8 timova ali nije bilo testirano jer nije bilo potrebno
