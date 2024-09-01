Pokretanje: node index.js

Program nije testiran van parametara koji su već podešeni za 1:1 simulaciju:
- Generisanje mečeva u grupnoj fazi je *nezavistan* od redosleda u `groups.json`
- Drugačiji redosled timova u grupi bi radio ali nije testiran
- Egzibicioni mečevi nisu bili modifikovani ali imaju uticaj na formu tima
- Klase RoundRobinFormat i SingleEliminationFormat podržavaju više od 12/8 timova ali nije bilo testirano jer nije bilo potrebno
