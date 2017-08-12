# dyfi.js

Dyfi.js päivittää dy.fi:n tarjoaman alidomainin. Rekisteröidäksesi sinulla pitää olla palvelin / ip-osoite suomalaiselta palveluntarjoajalta. Skriptin toimimiseksi sinun täytyy rekisteröityä ja luoda sivujen kautta jokin alidomain.

Tämä on kopio Python versiosta https://github.com/boarpig/dyfi.py mutta kirjoitettu JavaScriptillä. Python version reposta löytyy kattavampi README, mikäli haluat hyödyntää JavaScript versiota, suosittelen soveltamaan Python ohjeita.

## Käyttö

``bash
./dyfi.js -a                 # lisää domain
./dyfi.js -u                 # päivitä domainit, jotka löytyvät konffi tiedostosta
./dyfi.js -i                 # näytä tietoa konffitiedostosta
./dyfi.js -f                 # force - pakota päivitys
``

## Puutteita

Ohjelmassa voi olla hyvinkin puutteita. Forkkaa & korjaa :). Esimerkiksi isFile() funktio löytyy, mutta sitä ei ole kaikissa kohden hyödynnetty. Tarkoitukseni oli kirjoittaa ohjelmanpätkä suhteellisen vähillä moduuli riippuvuuksilla, joten jos haluat tyylikkäämpää ulkoasua, niin tuohon voi lisätä esim chalk tai colors moduulin näyttämään värit konsolissa.