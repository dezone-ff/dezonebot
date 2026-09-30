const express = require('express');
const app = express();
app.get('/', (req,res)=> res.send('Dezone Bot Online!'));
app.listen(3000, ()=> console.log('Server running'));

const {default:makeWASocket,useMultiFileAuthState} = require('@whiskeysockets/baileys')
const pino = require('pino')
const qrcode = require('qrcode-terminal')

async function start(){
const {state,saveCreds} = await useMultiFileAuthState('auth')
const sock = makeWASocket({
auth: state,
logger: pino({level:'silent'}),
printQRInTerminal: true,
browser: ["Dezone","Chrome","1.0"]
})
sock.ev.on('creds.update', saveCreds)
sock.ev.on('connection.update', async(u)=>{
const {qr, connection, lastDisconnect} = u
if(qr){
qrcode.generate(qr, {small:true});
console.log("SCAN QR ABOVE WITH WHATSAPP > LINKED DEVICES")
}
if(connection==='open'){ console.log("✅ BOT CONNECTED - WELCOME ACTIVE") }
if(connection==='close'){
console.log("Closed, restarting...")
if(lastDisconnect?.error?.output?.statusCode!== 401){
setTimeout(start,5000)
}
}
})

// WELCOME BOT
sock.ev.on('group-participants.update', async(a)=>{
try{
let gName = "Group"
try{ let meta = await sock.groupMetadata(a.id); gName = meta.subject }catch{}
for(let user of a.participants){
if(a.action == 'add'){
await sock.sendMessage(a.id,{
text: `*WELCOME TO ${gName}* 🌟\n\nHello @${user.split('@')[0]} 👋\nPlease read group rules & enjoy!\n\n> Powered by Dezone Bot`,
mentions: [user]
})
}
if(a.action == 'remove'){
await sock.sendMessage(a.id,{
text: `Goodbye @${user.split('@')[0]} 👋`,
mentions: [user]
})
}
}
}catch(e){ console.log(e.message) }
})
}
start()
