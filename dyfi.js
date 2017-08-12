#!/usr/bin/env node

/**
 * @author Juho Vähäkangas
 * 
 * Kopio python versiosta https://github.com/boarpig/dyfi.py
 * 
 */


/**
 * Ulkopuoliset moduulit, useimmiten saattavat löytyä valmiiksi
 *  $ npm i -g request commander
 */
const request = require('request')
const program = require('commander')

// built-in
const readline = require('readline')
const path = require('path')
const fs = require('fs')
const util = require('util')


// ip muuttujassa luotetaan että tulee järkevä ip osoite 
var ip = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/;

// dy.fi:n kiinteät osoitteet
const baseurl = 'https://www.dy.fi/nic/update?hostname='
const ipurl = 'http://checkip.dy.fi/'

// home kohta vaatii mahdollisesti windows ympäristössä säätöä
var home = process.env[(process.env == 'win32' ? 'USERPROFILE' : 'HOME')]

// konffitiedosto kotihakemistossa
var cfg = home + '/' + '.dyfi.json'

/**
 * readFile luetaan konffi tiedosto 
 * 
 * @param {*} cb 
 */

var readFile = function(cb) {
    if (fs.existsSync(cfg)) {
        cb(JSON.parse(fs.readFileSync(cfg, 'utf-8')))
    } 
}

/**
 * writeFile kirjoitetaan konffi tiedosto
 * 
 * @param {*} obj 
 */
var writeFile = function(obj) {
    if (!obj) {
        fs.writeFileSync(cfg, null, 'utf-8')
    }
    fs.writeFileSync(cfg, JSON.stringify(obj), 'utf-8')
}

/**
 * isFile onko konffia olemassa
 * 
 * @return {boolean}
 */
var isFile = function() {
    if (fs.existsSync(cfg)) {
        return true
    } else {
        return false
    }

}

/**
 * getIP hakee checkip.dy.fi osoitteen kautta ip-numeron
 * 
 * @return Promise 
 */
var getIP = new Promise (
    function (resolve, reject) {
            request.get(ipurl, function (err, res, body) {
                if (err) {
                    reject(err)
                }
                resolve(body.match(ip)[0])
        })
    }
)

/**
 * update tekee palvelimelle päivityksen ja tulostaa vastauksen
 * 
 * @return {boolean}
 * 
 * @param {object} cfg 
 */
var update = function(cfg) {
    var success
    request.get(baseurl + cfg.domain, 
        { 'auth':
            {
                username: cfg.username,
                password: cfg.password
            }
        }, function(err, res, body) {
        if (res.statusCode != 200) {
            console.log('dy.fi palvelin virhe: ', res.statusCode)
        } else {
            if (body.match('good')) {
                console.log('Päivitys onnistui: ' + host + ' ' + body)
                success = true
            }
            if (body.match('nochg')) {
                console.log('Onnistui. Ei muutoksia.')
                success = true
            }

            // falset
            if (body.match('nohost')) {
                console.log('Domain nimeä ei annettu tai käyttäjä ei omista domainia')
                success = false
            }
            if (body.match('badauth')) {
                console.log('Tunnistautuminen epäonnistui.')
                success = false
            }
            if (body.match('notfqdn')) {
                console.log('Domain nimi ei ole oikea .dy.fi domain')
                success = false
            }
            if (body.match('badip')) {
                console.log('IP osoite on virheellinen tai ei suomalaisomisteinen')
                success = false
            }
            if (body.match('dnserr')) {
                console.log('Tekninen virhe dy.fi palvelimissa.')
                success = false
            }
            if (body.match('abuse')) {
                console.log('Päivitys estetty väärinkäytön vuoksi.')
                success = false
            }
        }
        return success
    })
}

/**
 * UpdateAll on void tyyppinen funktio. Päivitetään konffista löytyvät kaikki domainit.
 * 
 * @param {boolean} forced 
 */

var UpdateAll = function(forced = false) {
    var newestIP
    var domainCount = 0
    readFile((res) => {
        var data
        data = res
        domainCount = Object.keys(data).length
        if (forced) {
            for (var prop in data) {
            setTimeout(() => { 
                        update(data)
                        data[prop].lastip = newestIP
                        data[prop].datetime = new Date() 
                    }, 2000)
            }
            writeFile(data)
            console.log('Pakotettu päivitys tehty.')
            process.exit(0)
        }
        if (domainCount > 0) {
            getIP.then((ip) => { 
                
                newestIP = ip
            })
            getIP.then((ip) => {
                
                for (var prop in data) {
                    if (data[prop].lastip === newestIP) {
                        domainCount--
                    }
                }
                if (domainCount === 0) {
                    console.log('Kaikissa domaineissa on pysynyt IP osoite samana.')
                    process.exit(0)
                }
                for (var prop in data) {
                    if (data[prop].lastip == newestIP) {
                        console.log(data[prop].domain + ' ei päivitetty, sama ip, kuin aiemmin')
                    } else {
                        setTimeout(() => { 
                            if (update(data[prop])) {
                                data[prop].lastip = newestIP
                                data[prop].datetime = new Date() 
                            }
                        }, 2000)
                        data[prop].lastip = newestIP
                        data[prop].datetime = new Date() 
                        writeFile(data)
                     
                    }
                    

                }
            })
        }
    })   
}

/**
 * lastUpdate kaivetaan konffi tiedostosta tieto koska viimeksi päivitetty.
 * 
 * @return {int} päivät
 * 
 * @param {Date} time 
 */

var lastUpdate = function(time) {
    let now = new Date()
    let old = new Date(time)
    let oneDay = 1000 * 60 * 60 * 24
    let difference = now.getTime() - old.getTime()
    let ret = Math.round(difference / oneDay)
    return ret
}

/**
 *  AddHost void tyyppinen funktio. Kysellään tarvittavat tiedot
 */

var AddHost = function() {
    
    var config = new Object()
 
    var data   = new Object()

    readFile((res) => {
        data = res
    })
    
    const rl = readline.createInterface({
        input:  process.stdin,
        output: process.stdout
    })
    
    rl.question('Käyttäjä: ', (username) => {
        if (!username) {
            console.log('Käyttäjänimi on pakollinen.')
            process.exit(1)
        }
            config.username = username
        rl.question('Salasana: ', (password) => {
            if (!password) {
                console.log('Salasana on pakollinen.')
                process.exit(1)
            }
            config.password = password
            config.lastip = getIP.then((res) => { config.lastip = res })
        rl.question('Domain nimi (myös .dy.fi): ', (domain) => {
            if (!domain) {
                console.log('Domain nimi on pakollinen.')
            }
            if (data.hasOwnProperty(domain)) {
                console.log('Konffi tiedostosta löytyi jo kyseinen domain.')
                process.exit(1)
            }
            config.domain = domain

            config.datetime = new Date()

            data[domain] = config

            rl.close() 

            writeFile(data)
            })
        })
    })
}

/**
 * Info void tyyppinen funktio. Näytetään konffi tiedostosta olevia tietoja. Ei toki salasanaa :).
 */
var Info = function() {
    readFile((res) => {
        for (var prop in res) {
            console.log('Domain:      ', res[prop].domain)
            console.log('Viimeisin IP:', res[prop].lastip)
            if (lastUpdate(res[prop].datetime === 0)) {
                console.log('Päivitetty:   Päivitetty hetki sitten.')
            } else {
                console.log('Päivitetty:  ', lastUpdate(res[prop].datetime), 'päivää sitten')
            }
        }
    })    
}

/**
 * Edit on void tyyppinen funktio. Konffi tiedostoa pääsee kätevästi muokkaamaan oletus editorin avulla
 * ei tarvitse etsiä konffitiedoston sijaintia.
 */

var Edit = function() {
    var editor = process.env.EDITOR || 'vi'
    var child_process = require('child_process')
    var child = child_process.spawn(editor, [cfg], {
        stdio: 'inherit'
    })
    child.on('exit', () => {
        process.exit(0)
    })
    
}

program
 .version('0.0.3')
 .option('-a, --add', 'Lisää dy.fi nimi')
 .option('-u, --update', 'Päivitä dynaamiset osoitteet')
 .option('-i, --info', 'Tulosta tietoa domaineista')
 .option('-e, --edit', 'Muokkaa json tiedostoa käsin')
 .option('-f, --force', 'Pakota domainien päivitys')
 .parse(process.argv)

if (!process.argv.slice(2).length) {
     program.outputHelp()
}

if (program.add) {
    AddHost()
}

if (program.update) {
    UpdateAll()
}

if (program.info) {
    Info()
}

if (program.edit) {
    Edit()
}
if (program.force) {
    UpdateAll(true)
}