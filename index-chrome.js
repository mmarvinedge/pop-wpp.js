const fs = require('fs');
const { Client, Location } = require('./whatsapp-web');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const ini = require('ini');
var Request = require("request");

const config = ini.parse(fs.readFileSync('./wpppopsales.ini', 'utf-8'));
const parametros = config.parametros;
const companyName = parametros.company;
const latitude = parametros.latitude;
const longitude = parametros.longitude;
const endereco = parametros.endereco;
/*const url = parametros.url;*/

const chrome = ini.parse(fs.readFileSync('./chromepath.ini', 'utf-8'));
const path = chrome.path.path;

const SESSION_FILE_PATH = './session.json';
let sessionCfg;
console.log('EXISTE SESSION? ' + fs.existsSync(SESSION_FILE_PATH));
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
};

function diff_minutes(dt2, dt1) {
    var diff = (dt2.getTime() - dt1.getTime()) / 1000;
    diff /= 60;
    return Math.abs(Math.round(diff));
}

var intent = [];

const client = new Client({
    puppeteer: {
        executablePath: path,
        headless: false,
        args: ['--no-sandbox', '--start-maximized'],
        defaultViewport: null
    },
    session: sessionCfg
});

client.initialize();

client.on('qr', (qr) => {
    // NOTE: This event will not be fired if a session is specified.
    console.log('QR RECEIVED', qr);
});

client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    sessionCfg = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessfull
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', () => {
    console.log('READY');
});

client.on('message', async msg => {

    //console.log('MESSAGE RECEIVED', msg);

    const found = intent.find(element => element.number === msg.from);
    const indexPos = intent.indexOf(element => element.number === msg.from, 0);
    var outTime = 'true';

    console.log('chegou mensagem')

    if (found && found !== null && found !== undefined) {
        console.log('diff minutes: ' + diff_minutes(found.date, new Date()))
        if (diff_minutes(found.date, new Date()) < 120) {
            outTime = 'false';
        } else {
            intent.splice(indexPos, 1);
            outTime = 'true';
        }
    }

    if (outTime === 'false') {
        var mensagem = msg.body.toLowerCase();
        if (mensagem == 'localização' || mensagem == 'localizacao' || mensagem == 'local') {
            msg.reply(new Location(`${latitude}`, `${longitude}`, `${companyName} \n ${endereco}`));
        }
    }

    const contact = await msg.getContact();
    const chat = await msg.getChat();
    var remetente = msg.to.replace('@c.us', '');
    var destinatario = msg.from.replace('@c.us', '');

    if (outTime === 'true') {
        if (msg.type === 'chat') {
            var mensagem = msg.body.toLowerCase();
            if (mensagem == 'localização' || mensagem == 'localizacao' || mensagem == 'local') {
                msg.reply(new Location(`${latitude}`, `${longitude}`, `${companyName} \n ${endereco}`));
            } else {
                if (!msg.isGroup) {
                    // Send a new message as a reply to the current one
                    if (!chat.isGroup) {
                        var company = msg.to.replace('@c.us', '');
                        var cliente = msg.from.replace('@c.us', '');

                        Request.post({
                            "headers": { "content-type": "application/json" },
                            "url": "http://food.popsales.com.br:4000/api",
                            //"url": "http://localhost:4000/api",
                            "body": JSON.stringify({
                                "phoneCompany": company,
                                "phoneConsumidor": cliente
                            })
                        }, (error, response, body) => {
                            if (error) {
                                return console.dir(error);
                            }
                            /*console.dir(JSON.parse(body));*/
                            var bodyObj = JSON.parse(body);
                            if (response.statusCode == 200) {
                        if (contact.pushname == undefined) {
                            if (!chat.isGroup) {
                                chat.sendMessage(`Olá, para acessar nosso cardápio acesse o link abaixo, não é necessário baixar nenhum aplicativo, o link irá mostrar nosso cardápio completo e por ele mesmo você pode selecionar o que deseja e concluir seu pedido.\n\n${bodyObj.url}?&tel=${cliente}#!`)
                                //msg.reply(`Para acessar nosso cardápio acesse o link abaixo, não é necessário baixar nenhum aplicativo, o link abaixo irá mostrar nosso cardápio e por ele mesmo você pode selecionar o que deseja e concluir seu pedido.\n\nhttp://11649c3a.ngrok.io/popsales/?id=5e82219c1c9d44000019bb93#!`)
                                intent.push({ number: msg.from, date: new Date() });
                            }
                        } else {
                            if (!chat.isGroup) {
                                chat.sendMessage(`Olá ${contact.pushname}, para acessar nosso cardápio acesse o link abaixo, não é necessário baixar nenhum aplicativo, o link irá mostrar nosso cardápio completo e por ele mesmo você pode selecionar o que deseja e concluir seu pedido.\n\n${bodyObj.url}?&tel=${cliente}#!`)
                                //msg.reply(`Para acessar nosso cardápio acesse o link abaixo, não é necessário baixar nenhum aplicativo, o link abaixo irá mostrar nosso cardápio e por ele mesmo você pode selecionar o que deseja e concluir seu pedido.\n\nhttp://11649c3a.ngrok.io/popsales/?id=5e82219c1c9d44000019bb93#!`)
                                intent.push({ number: msg.from, date: new Date() });
                            }
                        }
                    } else {
                                msg.reply(`Ocorreu um erro ao buscar o cardápio.`)
                            }
                        });
                    }
                }
            }
        }
    }
});

app.listen(3300, function () {
    console.log('WhatsApp server listen on port 3300')
});

app.use(
    bodyParser.urlencoded({
        extended: true
    })
);

app.use(bodyParser.json());

app.post('/whats', function (req, res) {
    console.log(req.body)
    var bodyObj = req.body;
    var msg = bodyObj.message;
    msg = msg.split('///').join('🔲');
    msg = msg.split(';;').join('👤');
    msg = msg.split('#').join('☑️');
    msg = msg.split(']').join('📰');
    msg = msg.split('=').join('➕');
    msg = msg.split('%').join('📞');
    msg = msg.split('[').join('💵');
    msg = msg.split('¨').join('💰');
    msg = msg.split('{').join('🏡');
    msg = msg.split('@').join('📍');
    msg = msg.split('¬').join('▪️');
    msg = msg.split('¢').join('🏍💨');
    msg = msg.split('£').join('😋');
    msg = msg.split('??').join('🛎');
    msg = msg.split('çç').join('❎');
    msg = msg.split('²').join('⚠️');
    msg = msg.split('ª').join('📛');
    msg = msg.split('Valor:').join('\nValor:');
    msg = msg.split('|').join('\n');
    number = bodyObj.number.includes('@c.us') ? bodyObj.number : `${bodyObj.number}@c.us`;
    //number = `${bodyObj.number}@c.us`;
    client.sendMessage(number, msg);
    res.send('mandei a mensagem');
});