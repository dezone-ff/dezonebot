const express = require('express');
const app = express();
app.get('/', (req,res)=> res.send('Dezone Bot Online'));
app.listen(process.env.PORT || 10000, ()=> console.log('Server running on 10000'));

const {default:makeWASocket, useMultiFileAuthState, DisconnectReason} = require('@whiskeysockets/baileys');
const pino = require('pino');

async function startBot(){
  const {state, saveCreds} = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({
    auth: state,
    logger: pino({level:'silent'}),
    printQRInTerminal: false,
    browser: ["Ubuntu","Chrome","20.0.04"]
  });
  sock.ev.on('creds.update', saveCreds);

  if(!sock.authState.creds.registered){
    // Try to get pairing code with retry
    const getCode = async () => {
      try {
        await new Promise(r=> setTimeout(r, 2000));
        let code = await sock.requestPairingCode("2349061100825");
        console.log("\n==================================");
        console.log(`YOUR PAIR CODE: ${code}`);
        console.log("WhatsApp > Linked Devices > Link with phone number");
        console.log("==================================\n");
      } catch(e){
        console.log("Retry pair in 5s...", e.message);
        setTimeout(getCode, 5000);
      }
    };
    getCode();
  }

  sock.ev.on('connection.update', async(u)=>{
    const {connection, lastDisconnect} = u;
    console.log("Connection:", connection);
    if(connection === 'open'){
      console.log("✅ BOT CONNECTED - SUCCESS!");
    }
    if(connection === 'close'){
      let reason = lastDisconnect?.error?.output?.statusCode;
      console.log("Closed, restarting in 5s... Reason:", reason);
      setTimeout(startBot, 5000);
    }
  });

  sock.ev.on('group-participants.update', async(ev)=>{
    try{
      if(ev.action!== 'add') return;
      let meta = await sock.groupMetadata(ev.id).catch(()=>null);
      let name = meta? meta.subject : "this group";
      for(let p of ev.participants){
        await sock.sendMessage(ev.id, {
          text: `*WELCOME TO ${name}* 🌟\n\nHey @${p.split('@')[0]} 👋\nWelcome! Please read pinned rules.\n\n> Dezone Bot`,
          mentions: [p]
        });
      }
    }catch(e){}
  });
}
startBot();
