const PastebinAPI = require('pastebin-js');
const pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL');
const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
const QRCode = require('qrcode'); 
let router = express.Router();
const pino = require('pino');
const {
    default: DARK_SURYA,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require('@whiskeysockets/baileys');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    
    async function SURYA_X_QR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        try {
            let Qr_Code_By_DARK_SURYA = DARK_SURYA({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })),
                },
                printQRInTerminal: false,
                logger: pino({ level: 'fatal' }).child({ level: 'fatal' }),
                browser: Browsers.macOS('Chrome')
            });

            Qr_Code_By_DARK_SURYA.ev.on('creds.update', saveCreds);
            Qr_Code_By_DARK_SURYA.ev.on('connection.update', async (s) => {
                const { connection, lastDisconnect, qr } = s;

                if (qr) {
                    if (!res.headersSent) {
                        let qr_buffer = await QRCode.toBuffer(qr);
                        res.type('png');
                        res.send(qr_buffer);
                    }
                }

                if (connection === 'open') {
                    await delay(5000);
                    let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                    let b64data = Buffer.from(data).toString('base64');
                    let session = await Qr_Code_By_DARK_SURYA.sendMessage(Qr_Code_By_DARK_SURYA.user.id, { text: 'SURYA-X~' + b64data });

                    let SURYA_X_TEXT = `
╔════════════════════◇
║『 SESSION CONNECTED』
║ ✨ SURYA-X 🔷
║ ✨ SURYAX OFFICIAL🔷
╚════════════════════╝


---

╔════════════════════◇
║『 YOU'VE CHOSEN SURYA-X 』
║ -Set the session ID in Heroku:
║ - SESSION_ID:
╚════════════════════╝
╔════════════════════◇
║ 『••• _V𝗶𝘀𝗶𝘁 𝗙𝗼𝗿_H𝗲𝗹𝗽 •••』
║❍ 𝐘𝐨𝐮𝐭𝐮𝐛𝐞: youtube.com/
║❍ 𝐎𝐰𝐧𝐞𝐫: +917797099719
║❍ 𝐑𝐞𝐩𝐨: https://github.com/darksurya345/SURYA-X 
║❍ 𝐖𝐚𝐆𝗿𝐨𝐮𝐩: https://chat.whatsapp.com/L0oWvAe4eeb6HBYIEPXGbo?mode=gi_t
║❍ 𝐖𝐚𝐂𝐡𝐚𝐧𝐧𝐞𝐥: https://whatsapp.com/channel/0029Vb64JNKJf05UHKREBM1h
║❍ 𝐓𝐞𝐥𝐞𝐠𝐫𝐚𝐦: https://t.me/DARKSURYA_345
║ ☬ ☬ ☬ ☬
╚═════════════════════╝
𒂀 Enjoy SURYA-X


---

Don't Forget To Give Star⭐ To My Repo
______________________________`;

                    await Qr_Code_By_DARK_SURYA.sendMessage(Qr_Code_By_DARK_SURYA.user.id, { text: SURYA_X_TEXT }, { quoted: session });

                    await delay(100);
                    await Qr_Code_By_DARK_SURYA.ws.close();
                    return removeFile('./temp/' + id);
                } else if (connection === 'close' && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10000);
                    SURYA_X_QR_CODE();
                }
            });
        } catch (err) {
            removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ code: 'Service Currently Unavailable' });
            }
        }
    }
    
    return await SURYA_X_QR_CODE();
});

module.exports = router;
