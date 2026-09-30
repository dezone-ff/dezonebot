const express = require('express');
const app = express();
app.get('/', (req,res)=> res.send('Dezone Bot Online!'));
app.listen(3000, ()=> console.log('Server running'));

const {default:makeWASocket,useMultiFileAuthState} = require('@whiskeysockets/baileys')
const pino = require('pino')

async function start(){
const {state,saveCreds} = await useMultiFileAuthState('auth')
const sock = makeWASocket({
auth: state,
logger: pino({level:'silent'}),
printQRInTerminal: false,
browser: ["Dezone","Chrome","1.0"]
})
sock.ev.on('creds.update', saveCreds)

if(!sock.authState.creds.registered){
let phone = "2349061100825"
setTimeout(async()=>{
try{
let code = await sock.requestPairingCode(phone)
console.log(`\nPAIR CODE FOR ${phone}: ${code}\nGo to WhatsApp > Linked Devices > Link with phone number > Enter this code`)
}catch(e){console.log("Failed to get pair code:",e.message)}
},3000)
}

sock.ev.on('connection.update', async(u)=>{
const {connection, lastDisconnect} = u
if(connection==='open'){ console.log("✅ BOT CONNECTED") }
if(connection==='close'){
console.log("Closed, restarting...")
if(lastDisconnect?.error?.output?.statusCode!== 401){
setTimeout(start,5000)
}
}
})

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
}
}catch(e){}
})
}
start()
