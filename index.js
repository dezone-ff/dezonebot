const express = require('express');
const app = express();
app.get('/', (req,res)=> res.send('Dezone Bot - Online'));
app.listen(process.env.PORT || 3000, ()=> console.log('Web server running'));

const {default:makeWASocket, useMultiFileAuthState} = require('@whiskeysockets/baileys');
const pino = require('pino');

async function startBot(){
  const {state, saveCreds} = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({
    auth: state,
    logger: pino({level:'silent'}),
    printQRInTerminal: false,
    browser: ["Dezone","Chrome","1.0.0"]
  });
  sock.ev.on('creds.update', saveCreds);

  // Pair code logic - only if not registered
  if(!sock.authState.creds.registered){
    await new Promise(r=> setTimeout(r,3000));
    try{
      let num = "2349061100825";
      let code = await sock.requestPairingCode(num);
      console.log(`\n============================`);
      console.log(`PAIR CODE FOR ${num}: ${code}`);
      console.log(`Go to WhatsApp > Linked Devices > Link with phone number`);
      console.log(`============================\n`);
    }catch(e){
      console.log("Pair Error:", e.message);
    }
  }

  sock.ev.on('connection.update', async(u)=>{
    const {connection, lastDisconnect} = u;
    console.log("Connection:", connection);
    if(connection === 'open'){
      console.log("✅ BOT CONNECTED SUCCESSFULLY");
    }
    if(connection === 'close'){
      console.log("Closed, will restart in 5s...");
      setTimeout(startBot, 5000);
    }
  });

  // Welcome
  sock.ev.on('group-participants.update', async(an)=>{
    try{
      let meta = await sock.groupMetadata(an.id).catch(()=>null);
      let gName = meta? meta.subject : "the group";
      for(let p of an.participants){
        if(an.action === 'add'){
          await sock.sendMessage(an.id, {text: `*WELCOME TO ${gName}* 🌟\n\nHey @${p.split('@')[0]} 👋\nPlease read group rules!\n\n> Powered by Dezone Bot`, mentions:[p]});
        }
      }
    }catch(e){ console.log(e.message) }
  });
}
startBot();
