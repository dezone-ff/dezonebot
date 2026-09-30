const PHONE_NUMBER = "2348164172585"; // BOT NUMBER: 08164172585

const express = require('express');
const app = express();
let qrData = null;

app.get('/', (req,res)=>{
  if(qrData) return res.send(`<h1>Dezone Bot QR</h1><p>BOT: ${PHONE_NUMBER}</p><p>Scan with WhatsApp account 08164172585</p><img src="${qrData}" style="width:300px"><br><small>Refresh if expired</small>`);
  res.send(`<h1>Bot Starting... ${PHONE_NUMBER}</h1><p>Wait 30s and refresh. Check Render Logs for PAIR CODE too.</p>`);
});
app.listen(process.env.PORT || 10000, ()=> console.log('Server running for', PHONE_NUMBER));

const {default:makeWASocket, useMultiFileAuthState} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode');
const fs = require('fs');

async function startBot(){
  try{ if(fs.existsSync('./auth') &&!fs.existsSync('./auth/creds.json')) fs.rmSync('./auth',{recursive:true,force:true}); }catch(e){}
  const {state, saveCreds} = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({ auth: state, logger: pino({level:'silent'}), printQRInTerminal:false, browser:["Ubuntu","Chrome","20.0.04"] });
  sock.ev.on('creds.update', saveCreds);

  // PAIR CODE
  if(!sock.authState.creds.registered){
    setTimeout(async()=>{
      try{
        let code = await sock.requestPairingCode(PHONE_NUMBER);
        console.log(`\n===== BOT ${PHONE_NUMBER} =====`);
        console.log(`PAIR CODE: ${code}`);
        console.log(`Enter this on phone 08164172585`);
        console.log(`WhatsApp > Linked Devices > Link with phone number`);
        console.log(`==============================\n`);
      }catch(e){ console.log("Pair retry in 10s:", e.message); }
    },3000);
  }

  sock.ev.on('connection.update', async(u)=>{
    const {connection, qr} = u;
    console.log("Conn:", connection);
    if(qr){
      qrData = await qrcode.toDataURL(qr);
      console.log("QR ready - Open https://dezone-v2-bot.onrender.com to scan");
    }
    if(connection === 'open'){ console.log("✅ BOT CONNECTED AS", PHONE_NUMBER); qrData = null; }
    if(connection === 'close'){ console.log("Closed, restart in 5s"); setTimeout(startBot,5000); }
  });

  sock.ev.on('group-participants.update', async(ev)=>{
    try{
      if(ev.action!== 'add') return;
      let meta = await sock.groupMetadata(ev.id).catch(()=>null);
      let name = meta? meta.subject : "this group";
      for(let p of ev.participants){
        await sock.sendMessage(ev.id, { text: `*WELCOME TO ${name}* 🌟\n\nHey @${p.split('@')[0]} 👋\nWelcome to the family! Read group rules.\n\n> Dezone Bot`, mentions: [p] });
      }
    }catch(e){}
  });
}
startBot();
