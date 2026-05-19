const TelegramBot = require("node-telegram-bot-api");
const {
    default: DARK_SURYA,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const QRCode = require('qrcode');
const { makeid } = require('./id');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

function initTelegramBot() {
    if (!BOT_TOKEN) {
        console.log('[Telegram] No TELEGRAM_BOT_TOKEN set. Bot disabled.');
        return;
    }

    const bot = new TelegramBot(BOT_TOKEN, { polling: true });
    console.log('[Telegram] Bot started successfully.');

    // /start
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId,
`╔════════════════════════╗
║       *SURYA-X*         ║
║    Session Linker       ║
╚════════════════════════╝

*Available Commands:*

🔗 /pair \`917797XXXXXX\`
Get session via Pair Code

▦ /qr
Get session via QR Code

❌ /cancel
Stop current session

_Include country code with number_
_Example: /pair 917797099719_`,
            { parse_mode: 'Markdown' }
        );
    });

    // /help
    bot.onText(/\/help/, (msg) => {
        bot.sendMessage(msg.chat.id,
`*SURYA-X — Help*

🔗 */pair <number>*
Enter number with country code
Example: \`/pair 917797099719\`

▦ */qr*
Generates a QR code
Scan it with WhatsApp

❌ */cancel*
Stop the current session`,
            { parse_mode: 'Markdown' }
        );
    });

    // /pair <number>
    bot.onText(/\/pair(?:\s+(\d+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const num = match[1];

        if (!num) {
            return bot.sendMessage(chatId,
`⚠️ *Number missing!*

Example: \`/pair 917797099719\`
_(Include country code)_`,
                { parse_mode: 'Markdown' }
            );
        }

        const id = makeid();
        bot.sendMessage(chatId, '⏳ Connecting to WhatsApp...', { parse_mode: 'Markdown' });

        try {
            const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);

            let sock = DARK_SURYA({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })),
                },
                printQRInTerminal: false,
                logger: pino({ level: 'fatal' }).child({ level: 'fatal' }),
                browser: Browsers.macOS('Chrome')
            });

            if (!sock.authState.creds.registered) {
                await delay(1500);
                const cleanNum = num.replace(/[^0-9]/g, '');
                const code = await sock.requestPairingCode(cleanNum);
                const formatted = code?.match(/.{1,4}/g)?.join('-') || code;

                bot.sendMessage(chatId,
`╔══════════════════════════╗
║      🔑 *PAIR CODE*       ║
╚══════════════════════════╝

*Code:* \`${formatted}\`

📌 *Steps:*
WhatsApp → ⋮ → *Linked Devices*
→ *Link a Device*
→ *Link with phone number*
→ Enter the code above`,
                    { parse_mode: 'Markdown' }
                );
            }

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on('connection.update', async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === 'open') {
                    await delay(5000);
                    let data = fs.readFileSync(`./temp/${id}/creds.json`);
                    let b64data = Buffer.from(data).toString('base64');
                    const sessionId = 'SURYA-X~' + b64data;

                    await sock.sendMessage(sock.user.id, { text: sessionId });

                    bot.sendMessage(chatId,
`✅ *Session Acquired Successfully!*

🆔 *Session ID:*
\`${sessionId}\`

╔════════════════════◇
║  SESSION CONNECTED  ║
║     ✨ SURYA-X 🔷   ║
╚════════════════════╝

╔════════════════════◇
║ ❍ Owner: +917797099719
║ ❍ Repo: github.com/darksurya345/SURYA-X
║ ❍ WaGroup: chat.whatsapp.com/L0oWvAe4eeb6HBYIEPXGbo
║ ❍ Channel: whatsapp.com/channel/0029Vb64JNKJf05UHKREBM1h
║ ❍ Telegram: t.me/DARKSURYA_345
╚════════════════════╝`,
                        { parse_mode: 'Markdown' }
                    ).catch(() => {
                        const buf = Buffer.from(sessionId, 'utf-8');
                        bot.sendDocument(chatId, buf, {
                            caption: '✅ *Session ready! See attached file.*',
                            parse_mode: 'Markdown'
                        }, { filename: 'session.txt', contentType: 'text/plain' });
                    });

                    await delay(100);
                    await sock.ws.close();
                    removeFile('./temp/' + id);

                } else if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== 401) {
                    bot.sendMessage(chatId, '❌ Connection closed. Please try /pair again.');
                    removeFile('./temp/' + id);
                }
            });

        } catch (err) {
            console.error('[Telegram pair] Error:', err.message);
            bot.sendMessage(chatId, '❌ *Error:* ' + err.message, { parse_mode: 'Markdown' });
            removeFile('./temp/' + id);
        }
    });

    // /qr
    bot.onText(/\/qr/, async (msg) => {
        const chatId = msg.chat.id;
        const id = makeid();

        bot.sendMessage(chatId, '⏳ Generating QR Code...');

        try {
            const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);

            let sock = DARK_SURYA({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })),
                },
                printQRInTerminal: false,
                logger: pino({ level: 'fatal' }).child({ level: 'fatal' }),
                browser: Browsers.macOS('Chrome')
            });

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on('connection.update', async (s) => {
                const { connection, lastDisconnect, qr } = s;

                if (qr) {
                    const qrBuf = await QRCode.toBuffer(qr, {
                        color: { dark: '#000000', light: '#ffffff' },
                        width: 300,
                        margin: 2
                    });
                    bot.sendPhoto(chatId, qrBuf, {
                        caption: `📸 *QR Code Ready!*\n\nWhatsApp → ⋮ → *Linked Devices*\n→ *Link a Device* → *Scan QR Code*\n\n_Expires in ~20 seconds_`,
                        parse_mode: 'Markdown'
                    });
                }

                if (connection === 'open') {
                    await delay(5000);
                    let data = fs.readFileSync(`./temp/${id}/creds.json`);
                    let b64data = Buffer.from(data).toString('base64');
                    const sessionId = 'SURYA-X~' + b64data;

                    await sock.sendMessage(sock.user.id, { text: sessionId });

                    bot.sendMessage(chatId,
`✅ *Session Acquired Successfully!*

🆔 *Session ID:*
\`${sessionId}\`

╔════════════════════◇
║  SESSION CONNECTED  ║
║     ✨ SURYA-X 🔷   ║
╚════════════════════╝

╔════════════════════◇
║ ❍ Owner: +917797099719
║ ❍ Repo: github.com/darksurya345/SURYA-X
║ ❍ WaGroup: chat.whatsapp.com/L0oWvAe4eeb6HBYIEPXGbo
║ ❍ Channel: whatsapp.com/channel/0029Vb64JNKJf05UHKREBM1h
║ ❍ Telegram: t.me/DARKSURYA_345
╚════════════════════╝`,
                        { parse_mode: 'Markdown' }
                    ).catch(() => {
                        const buf = Buffer.from(sessionId, 'utf-8');
                        bot.sendDocument(chatId, buf, {
                            caption: '✅ *Session ready! See attached file.*',
                            parse_mode: 'Markdown'
                        }, { filename: 'session.txt', contentType: 'text/plain' });
                    });

                    await delay(100);
                    await sock.ws.close();
                    removeFile('./temp/' + id);

                } else if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== 401) {
                    bot.sendMessage(chatId, '❌ Connection closed. Please try /qr again.');
                    removeFile('./temp/' + id);
                }
            });

        } catch (err) {
            console.error('[Telegram qr] Error:', err.message);
            bot.sendMessage(chatId, '❌ *Error:* ' + err.message, { parse_mode: 'Markdown' });
            removeFile('./temp/' + id);
        }
    });

    // /cancel
    bot.onText(/\/cancel/, (msg) => {
        bot.sendMessage(msg.chat.id, '✅ To cancel, simply start a new /pair or /qr command.');
    });

    bot.on('polling_error', (err) => {
        console.error('[Telegram] Polling error:', err.message);
    });

    return bot;
}

module.exports = { initTelegramBot };
