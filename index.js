const PHONE_NUMBER = "2349061100825"; // Your WhatsApp = 09061100825

const express = require('express');
const app = express();
app.get('/', (req,res)=> res.send('Dezone Bot Online '+PHONE_NUMBER));
app.listen(process.env.PORT || 10000, ()=> console.log('Server running'));

const {default:makeWASocket, useMultiFileAuthState, DisconnectReason} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

async function startBot(){
  try{ if(fs.existsSync('./auth/creds.json')==false && fs.existsSync('./auth')) fs.rmSync('./auth',{recursive:true,force:true}); }catch(e){}
  const {state, saveCreds} = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({
    auth: state,
    logger: pino({level:'silent'}),
    printQRInTerminal: false,
    browser: ["Ubuntu","Chrome","20.0.04"]
  });
  sock.ev.on('creds.update', saveCreds);

  if(!sock.authState.creds.registered){
    setTimeout(async()=>{
      try{
        let code = await sock.requestPairingCode(PHONE_NUMBER);
        console.log("\n==================================");
        console.log(`FOR NUMBER ${PHONE_NUMBER}`);
        console.log(`PAIR CODE: ${code}`);
        console.log("Link within 20 seconds!");
        console.log("==================================\n");
      }catch(e){ console.log("Pair error, will retry in 10s:", e.message); setTimeout(()=>startBot(),10000); }
    },3000);
  }

  sock.ev.on('connection.update', async(u)=>{
    const {connection, lastDisconnect} = u;
    console.log("Connection:", connection);
    if(connection === 'open') console.log("✅ CONNECTED! BOT IS ONLINE FOR", PHONE_NUMBER);
    if(connection === 'close'){
      console.log("Closed, restarting in 5s");
      setTimeout(startBot,5000);
    }
  });

  sock.ev.on('group-participants.update', async(ev)=>{
    try{
      if(ev.action!== 'add') return;
      let meta = await sock.groupMetadata(ev.id).catch(()=>null);
      let name = meta? meta.subject : "this group";
      for(let p of ev.participants){
        await sock.sendMessage(ev.id, { text: `*WELCOME TO ${name}* 🌟\n\nHey @${p.split('@')[0]} 👋\nWelcome! Please read pinned rules.\n\n> Dezone Bot`, mentions: [p] });
      }
    }catch(e){}
  });
}
startBot();
