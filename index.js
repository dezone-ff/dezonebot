const PHONE_NUMBER = "2348164172585";
const BOT_NAME = "Dezone AI";
const express = require('express');
const app = express();
let qrData = null;
app.get('/', (req,res)=>{
  if(qrData) return res.send(`<h1>${BOT_NAME} Online ✅</h1><p>Intelligent Bot Active</p><img src="${qrData}" width="300">`);
  res.send(`<h1>${BOT_NAME} Online ✅</h1><p>Commands:.ai.play.video.tiktok.tagall.help</p>`);
});
app.listen(process.env.PORT || 10000, ()=> console.log('Server running'));

const {default:makeWASocket, useMultiFileAuthState, downloadMediaMessage} = require('@whiskeysockets/baileys');
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
  sock.ev.on('connection.update', async(u)=>{
    const {connection, qr} = u;
    console.log("Conn:", connection);
    if(qr){ qrData = await qrcode.toDataURL(qr); console.log("QR ready"); }
    if(connection === 'open'){ console.log(`✅ ${BOT_NAME} CONNECTED ${PHONE_NUMBER}`); qrData = null; }
    if(connection === 'close'){ setTimeout(startBot,5000); }
  });

  // WELCOME
  sock.ev.on('group-participants.update', async(ev)=>{
    try{
      if(ev.action!== 'add') return;
      let meta = await sock.groupMetadata(ev.id).catch(()=>null);
      let name = meta? meta.subject : "this group";
      for(let p of ev.participants){
        await sock.sendMessage(ev.id, { text: `*WELCOME TO ${name}* 🌟\n\nHey @${p.split('@')[0]} 👋\nI am ${BOT_NAME}, your AI assistant!\nType.help to see what I can do.\n\n> Dezone Super Bot 🤖`, mentions: [p] });
      }
    }catch(e){}
  });

  // COMMANDS
  sock.ev.on('messages.upsert', async(m)=>{
    try{
      let msg = m.messages[0];
      if(!msg.message || msg.key.fromMe) return;
      let from = msg.key.remoteJid;
      let isGroup = from.endsWith('@g.us');
      let body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";
      if(!body) return;
      let text = body.trim();
      let lower = text.toLowerCase();
      let sender = msg.key.participant || msg.key.remoteJid;
      console.log("Msg:", from, text);

      //.help
      if(lower === '.help' || lower === '.menu'){
        await sock.sendMessage(from, { text: `*🤖 ${BOT_NAME} - ULTIMATE MENU*\n\n*🧠 AI CHAT:*\n.ai <question> - Ask anything\n.gpt <question> - AI chat\n.chat - Chat with AI (private)\n\n*🎵 DOWNLOADER:*\n.play <song name> - Download music\n.song <song name> - Same\n.video <yt link/name> - Download video\n.ytmp4 <link> - YT video\n.tiktok <link> - TikTok no watermark\n.ig <link> - Instagram video\n\n*👥 GROUP:*\n.tagall <msg> - Tag all members\n\n*🎨 TOOLS:*\n.sticker - Reply to image to make sticker\n\nJust type in private chat and I will reply intelligently!\n\nBot: ${PHONE_NUMBER}` }, {quoted: msg});
        return;
      }

      //.tagall
      if(lower.startsWith('.tagall')){
        let meta = await sock.groupMetadata(from).catch(()=>null);
        if(!meta) return;
        let participants = meta.participants.map(p=>p.id);
        let msgText = text.slice(7).trim() || "Attention everyone! 📢";
        let tagText = `📢 *${BOT_NAME} TAG*\n\n${msgText}\n\n`;
        participants.forEach(p=>{ tagText += `@${p.split('@')[0]} `; });
        await sock.sendMessage(from, { text: tagText, mentions: participants });
        return;
      }

      // AI CHAT -.ai.gpt.chat
      if(lower.startsWith('.ai ') || lower.startsWith('.gpt ') || lower.startsWith('.chat ')){
        let prompt = text.slice(4).trim();
        if(!prompt) { await sock.sendMessage(from, { text: "Ask me anything! Example:.ai who is Wizkid?" }, {quoted: msg}); return; }
        await sock.sendMessage(from, { text: `*${BOT_NAME} thinking...* 🤔` }, {quoted: msg});
        try{
          // Free AI API
          let res = await axios.get(`https://api.itsrose.life/tools/openai?prompt=${encodeURIComponent(prompt)}&model=gpt-3.5-turbo`, {timeout:15000}).catch(async()=>{
            return await axios.get(`https://api.siputzx.my.id/api/ai/gpt3?content=${encodeURIComponent(prompt)}`);
          });
          let answer = res.data?.result || res.data?.data || res.data?.answer || JSON.stringify(res.data).slice(0,1000);
          await sock.sendMessage(from, { text: `*${BOT_NAME} AI* 🧠\n\n${answer}` }, {quoted: msg});
        }catch(e){
          await sock.sendMessage(from, { text: `*${BOT_NAME} AI* 🧠\n\nI'm ${BOT_NAME}, an intelligent assistant! You asked: "${prompt}"\n\nI can help you with anything - music, videos, questions, advice. Try.play to download songs or.video for videos!` }, {quoted: msg});
        }
        return;
      }

      // AUTO AI REPLY IN PRIVATE CHAT
      if(!isGroup &&!text.startsWith('.')){
        if(text.length > 2){
          try{
            let res = await axios.get(`https://api.siputzx.my.id/api/ai/gpt3?content=${encodeURIComponent(text)}`, {timeout:10000});
            let answer = res.data?.data || res.data?.result || `Hello! I'm ${BOT_NAME} 🤖\n\nYou said: "${text}"\n\nI can:\n🎵 Download music - type.play <song name>\n🎬 Download video -.video <name>\n🧠 Answer anything -.ai <question>\n\nType.help for menu!`;
            await sock.sendMessage(from, { text: answer }, {quoted: msg});
          }catch(e){
            await sock.sendMessage(from, { text: `Hi there! 👋 I'm *${BOT_NAME}* - Your intelligent assistant!\n\nI saw your message: "${text}"\n\n*What I can do:*\n📥 Download music & videos\n🧠 Answer any question\n👥 Manage groups\n\nType *.help* to see all commands!` }, {quoted: msg});
          }
        }
        return;
      }

      //.play /.song - MUSIC
      if(lower.startsWith('.play ') || lower.startsWith('.song ')){
        let query = text.slice(5).trim();
        if(!query) { await sock.sendMessage(from, { text: "Example:.play Asake Lonely at the top" }, {quoted: msg}); return; }
        await sock.sendMessage(from, { text: `*🔍 Searching music:* ${query}` }, {quoted: msg});
        try{
          let search = await yts(query);
          let video = search.videos[0];
          if(!video) throw new Error("Not found");
          let info = `*🎵 ${BOT_NAME} MUSIC*\n\n*Title:* ${video.title}\n*Duration:* ${video.timestamp}\n*Views:* ${video.views}\n\n*Downloading...* ⏳`;
          await sock.sendMessage(from, { text: info }, {quoted: msg});
          // Try downloader API
          let dl = await axios.get(`https://api.ryzendesu.vip/api/downloader/ytmp3?url=${video.url}`).catch(()=>null);
          let audioUrl = dl?.data?.url || dl?.data?.result?.download || null;
          if(audioUrl){
            await sock.sendMessage(from, { audio: { url: audioUrl }, mimetype: 'audio/mpeg', fileName: `${video.title}.mp3` }, {quoted: msg});
          }else{
            await sock.sendMessage(from, { text: `*Found:* ${video.title}\n*Link:* ${video.url}\n\n*To download:*\nUse @ loader site or try.video command\n\n_YouTube blocking direct download, but here's link_ 👆` }, {quoted: msg});
          }
        }catch(e){ await sock.sendMessage(from, { text: `❌ Couldn't find "${query}". Try different name.` }, {quoted: msg}); }
        return;
      }

      //.video /.ytmp4
      if(lower.startsWith('.video ') || lower.startsWith('.ytmp4 ') || lower.startsWith('.yt ')){
        let query = text.split(' ').slice(1).join(' ').trim();
        if(!query) { await sock.sendMessage(from, { text: "Example:.video https://youtu.be/... or.video Asake video" }, {quoted: msg}); return; }
        await sock.sendMessage(from, { text: `*🎬 Downloading video...*` }, {quoted: msg});
        try{
          let url = query;
          if(!url.includes('youtube.com') &&!url.includes('youtu.be')){
            let search = await yts(query);
            url = search.videos[0]?.url;
          }
          let dl = await axios.get(`https://api.ryzendesu.vip/api/downloader/ytmp4?url=${url}`).catch(()=>null);
          let videoUrl = dl?.data?.url || dl?.data?.result?.download;
          if(videoUrl){
            await sock.sendMessage(from, { video: { url: videoUrl }, caption: `*${BOT_NAME} VIDEO* 🎬\nDownloaded!` }, {quoted: msg});
          }else{
            await sock.sendMessage(from, { text: `Video found: ${url}\n\nAPI limit. Try later or use y2mate.` }, {quoted: msg});
          }
        }catch(e){ await sock.sendMessage(from, { text: `❌ Video error: ${e.message}` }, {quoted: msg}); }
        return;
      }

      //.tiktok
      if(lower.startsWith('.tiktok ')){
        let url = text.split(' ')[1];
        if(!url) { await sock.sendMessage(from, { text: "Example:.tiktok https://vt.tiktok.com/..." }, {quoted: msg}); return; }
        await sock.sendMessage(from, { text: "*📥 Downloading TikTok...*" }, {quoted: msg});
        try{
          let res = await axios.get(`https://api.tiklydown.eu.org/api/download?url=${url}`);
          let videoUrl = res.data?.video?.noWatermark || res.data?.video?.watermark;
          if(videoUrl){
            await sock.sendMessage(from, { video: { url: videoUrl }, caption: `*${BOT_NAME} TIKTOK* 📱` }, {quoted: msg});
          }
        }catch(e){ await sock.sendMessage(from, { text: "❌ TikTok failed, try valid link" }, {quoted: msg}); }
        return;
      }

    }catch(e){ console.log("Error:", e.message); }
  });
}
startBot();
