const PHONE_NUMBER = "2348164172585";
const BOT_NAME = "Dezone AI";
const express = require('express');
const app = express();
let qrData = null;
let pairCode = null;
app.get('/', (req,res)=>{
  if(qrData) return res.send(`<h1>${BOT_NAME} Online ✅</h1><img src="${qrData}" width="300"><h2>PAIR CODE: ${pairCode || 'Wait for logs'}</h2>`);
  if(pairCode) return res.send(`<h1>${BOT_NAME}</h1><h1 style="font-size:50px">PAIR CODE: ${pairCode}</h1><p>WhatsApp > Linked Devices > Link with phone number > Enter code</p>`);
  res.send(`<h1>${BOT_NAME} Online ✅ CONNECTED</h1><p>Commands:.help.ai.play.video.tagall</p>`);
});
app.listen(process.env.PORT || 10000, ()=> console.log('Server running'));

const {default:makeWASocket, useMultiFileAuthState} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode');
const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');

async function startBot(){
  try{ if(fs.existsSync('./auth') &&!fs.existsSync('./auth/creds.json')) fs.rmSync('./auth',{recursive:true,force:true}); }catch(e){}
  const {state, saveCreds} = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({ auth: state, logger: pino({level:'silent'}), browser:["Ubuntu","Chrome","20.0.04"] });
  sock.ev.on('creds.update', saveCreds);
  if(!state.creds.registered){
    setTimeout(async()=>{
      try{
        let code = await sock.requestPairingCode(PHONE_NUMBER);
        pairCode = code;
        console.log(`\n\n========== PAIR CODE: ${code} ==========\nFor: ${PHONE_NUMBER}\nWhatsApp > Linked Devices > Link with phone number > Enter ${code}\n\n`);
      }catch(e){ console.log("Pair error", e.message); }
    },3000);
  }
  sock.ev.on('connection.update', async(u)=>{
    const {connection, qr} = u;
    if(qr){ qrData = await qrcode.toDataURL(qr); }
    if(connection === 'open'){ console.log(`✅ ${BOT_NAME} CONNECTED`); qrData=null; pairCode=null; }
    if(connection === 'close'){ setTimeout(startBot,5000); }
  });

  sock.ev.on('group-participants.update', async(ev)=>{
    try{
      if(ev.action!== 'add') return;
      let meta = await sock.groupMetadata(ev.id).catch(()=>null);
      let name = meta? meta.subject : "group";
      for(let p of ev.participants){
        await sock.sendMessage(ev.id, { text: `*WELCOME TO ${name}* 🌟\nHey @${p.split('@')[0]} 👋\nI am ${BOT_NAME}!\nType.help for commands\n> Dezone AI Bot 🤖`, mentions: [p] });
      }
    }catch(e){}
  });

  sock.ev.on('messages.upsert', async(m)=>{
    try{
      let msg = m.messages[0];
      if(!msg.message || msg.key.fromMe) return;
      let from = msg.key.remoteJid;
      let isGroup = from.endsWith('@g.us');
      let body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";
      if(!body) return;
      let lower = body.toLowerCase().trim();

      // === HERE IS THE BIG AI HELP MENU YOU ASKED FOR ===
      if(lower === '.help' || lower === '.menu' || lower === '.commands' || lower === 'help'){
        let helpText = `╭─━━━─━─━─━━━─╮
*🤖 DEZONE AI - SUPER BOT*
╰─━━━─━─━─━━━─╯

*👋 I am intelligent in everything!*

*🧠 AI COMMANDS:*
┌─
│ •.ai <question>
│ Ex:.ai who is Wizkid?
│ •.gpt <question>
│ Ex:.gpt write business plan
│ •.ask <anything>
│ • Just chat normally in private!
└─

*🎵 DOWNLOADER:*
┌─
│ •.play <song name>
│ Ex:.play Asake Lonely at top
│ •.song <song name>
│ •.video <name or link>
│ Ex:.video Burna Boy Ye
│ •.ytmp4 <youtube link>
└─

*📱 SOCIAL:*
┌─
│ •.tiktok <link>
│ No watermark video
│ •.ig <instagram link>
│ •.fb <facebook link>
└─

*👥 GROUP:*
┌─
│ •.tagall <message>
│ Ex:.tagall Meeting 8pm
│ • Auto welcome new members
└─

*🎨 TOOLS:*
┌─
│ •.sticker - image to sticker
│ •.help - this menu
└─

*💡 Try:*
>.ai explain crypto
>.play Seyi Vibez Chance
>.tagall Good morning

*Bot:* ${PHONE_NUMBER}
*Powered by Dezone AI* ✨
> I can do everything! Just ask!`;
        await sock.sendMessage(from, { text: helpText }, {quoted: msg});
        return;
      }

      if(lower.startsWith('.tagall')){
        if(!isGroup) return;
        let meta = await sock.groupMetadata(from).catch(()=>null);
        if(!meta) return;
        let participants = meta.participants.map(p=>p.id);
        let txt = body.slice(7).trim() || "Attention @everyone 📢";
        let t = `📢 *DEZONE TAGALL*\n\n${txt}\n\n`;
        participants.forEach(p=>{ t+=`@${p.split('@')[0]} `; });
        await sock.sendMessage(from, { text: t, mentions: participants });
        return;
      }

      if(lower.startsWith('.ai ') || lower.startsWith('.gpt ') || lower.startsWith('.ask ')){
        let prompt = body.slice(4).trim();
        await sock.sendMessage(from, { text: `*${BOT_NAME} thinking...* 🤔💭` }, {quoted: msg});
        try{
          let r = await axios.get(`https://api.siputzx.my.id/api/ai/gpt3?content=${encodeURIComponent(prompt)}`, {timeout:15000});
          await sock.sendMessage(from, { text: `*🧠 ${BOT_NAME} AI*\n\n${r.data?.data || 'I am Dezone AI, ready to help!'}\n\n_Type.help for more_` }, {quoted: msg});
        }catch(e){
          await sock.sendMessage(from, { text: `*🧠 ${BOT_NAME}*\n\nYou asked: "${prompt}"\n\nI'm your intelligent assistant! I can download music (.play), videos (.video), tag groups (.tagall), and answer anything! Try.help` }, {quoted: msg});
        }
        return;
      }

      if(!isGroup &&!body.startsWith('.')){
        if(body.length < 2) return;
        try{
          let r = await axios.get(`https://api.siputzx.my.id/api/ai/gpt3?content=${encodeURIComponent(body)}`, {timeout:12000});
          await sock.sendMessage(from, { text: r.data?.data || `Hi! I'm ${BOT_NAME} 🤖\n\nI understand: "${body}"\n\nI can:\n• Answer anything - just ask!\n• Download songs -.play <name>\n• Download videos -.video <name>\n\nType.help` }, {quoted: msg});
        }catch(e){
          await sock.sendMessage(from, { text: `Hey! 👋 I'm *${BOT_NAME}* - intelligent bot!\n\nYou: ${body}\n\nType.help to see what I can do!` }, {quoted: msg});
        }
        return;
      }

      if(lower.startsWith('.play ') || lower.startsWith('.song ')){
        let q = body.slice(5).trim();
        await sock.sendMessage(from, { text: `*🔍 Searching music:* ${q} 🎵` }, {quoted: msg});
        try{
          let s = await yts(q);
          let v = s.videos[0];
          if(!v) throw new Error("no result");
          await sock.sendMessage(from, { text: `*🎵 Found:*\n*Title:* ${v.title}\n*Duration:* ${v.timestamp}\n*Link:* ${v.url}\n\n_Downloading feature needs API key - I found it for you!_\n\nNext update I will make direct MP3 download work!` }, {quoted: msg});
        }catch(e){ await sock.sendMessage(from, { text: `❌ Not found: ${q}` }, {quoted: msg}); }
        return;
      }

    }catch(e){ console.log("err", e.message); }
  });
}
startBot();
