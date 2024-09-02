Pokretanje: `node index.js`

Program nije testiran van parametara koji su već podešeni za 1:1 simulaciju:
- Generisanje mečeva u grupnoj fazi zavisi od `config.js`, nema provere za nepostojeće timove/typo
- Egzibicioni mečevi nisu bili modifikovani ali imaju uticaj na formu tima
- Klase `RoundRobinFormat` i `SingleEliminationFormat` podržavaju više od 12/8 timova ali nije bilo testirano jer nije bilo potrebno
