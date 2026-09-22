const express=require("express");
const {Client,GatewayIntentBits,PermissionsBitField,REST,Routes,SlashCommandBuilder}=require("discord.js");
const TOKEN=process.env.DISCORD_TOKEN, CLIENT_ID=process.env.CLIENT_ID, LOG_CHANNEL_ID=process.env.LOG_CHANNEL_ID||"", PORT=process.env.PORT||10000;
if(!TOKEN||!CLIENT_ID){console.error("DISCORD_TOKEN または CLIENT_ID が未設定です。");process.exit(1);}
const app=express();
app.get("/",(_,res)=>res.status(200).send("Discord Anti-Raid Bot is running."));
app.get("/health",(_,res)=>res.status(200).json({status:"ok"}));
app.listen(PORT,()=>console.log("Health server listening on "+PORT));
const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.GuildMembers]});
const messages=new Map(), duplicates=new Map(), punished=new Map();
const CFG={window:10000,max:8,dupWindow:8000,dupMax:5,urlWindow:15000,urlMax:4,timeout:10*60*1000};
function mod(m){return m.permissions.has(PermissionsBitField.Flags.Administrator)||m.permissions.has(PermissionsBitField.Flags.ManageGuild)||m.permissions.has(PermissionsBitField.Flags.ModerateMembers);}
async function log(g,t){console.log("[SECURITY] "+g.name+": "+t);if(!LOG_CHANNEL_ID)return;const c=g.channels.cache.get(LOG_CHANNEL_ID);if(c?.isTextBased())await c.send("🛡️ "+t).catch(()=>{});}
async function punish(m,r){if(!m?.moderatable||mod(m))return false;const n=Date.now(),last=punished.get(m.id)||0;if(n-last<CFG.timeout)return false;punished.set(m.id,n);await m.timeout(CFG.timeout,r).catch(()=>{});return true;}
client.once("ready",async()=>{
 console.log("Logged in as "+client.user.tag);
 const cmds=[new SlashCommandBuilder().setName("security-status").setDescription("荒らし対策BOTの状態を表示"),new SlashCommandBuilder().setName("security-reset").setDescription("検知履歴をリセット")].map(x=>x.toJSON());
 try{await new REST({version:"10"}).setToken(TOKEN).put(Routes.applicationCommands(CLIENT_ID),{body:cmds});console.log("Slash commands registered.");}catch(e){console.error(e);}
});
client.on("messageCreate",async msg=>{
 if(!msg.guild||msg.author.bot||!msg.member||mod(msg.member))return;
 const now=Date.now(), key=msg.guild.id+":"+msg.author.id;
 let a=messages.get(key)||[];a=a.filter(t=>t>now-CFG.window);a.push(now);messages.set(key,a);
 if(a.length>=CFG.max){if(await punish(msg.member,"短時間の大量メッセージを検知"))await log(msg.guild,msg.author.tag+" を大量メッセージ対策で10分タイムアウトしました。");return;}
 const text=msg.content.trim().toLowerCase();
 if(text){const k=key+":"+text,n=(duplicates.get(k)||0)+1;duplicates.set(k,n);setTimeout(()=>duplicates.delete(k),CFG.dupWindow);if(n>=CFG.dupMax){if(await punish(msg.member,"同一内容の連投を検知"))await log(msg.guild,msg.author.tag+" を連投対策で10分タイムアウトしました。");return;}}
 const urls=(msg.content.match(/https?:\/\/\S+/gi)||[]).length;
 if(urls){const k=key+":urls",n=(duplicates.get(k)||0)+urls;duplicates.set(k,n);setTimeout(()=>duplicates.delete(k),CFG.urlWindow);if(n>=CFG.urlMax){if(await punish(msg.member,"短時間の大量URL投稿を検知"))await log(msg.guild,msg.author.tag+" を大量URL投稿対策で10分タイムアウトしました。");}}
});
client.on("interactionCreate",async i=>{
 if(!i.isChatInputCommand())return;
 const ok=i.memberPermissions?.has(PermissionsBitField.Flags.ModerateMembers)||i.memberPermissions?.has(PermissionsBitField.Flags.Administrator);
 if(!ok)return i.reply({content:"このコマンドはモデレーター以上のみ使用できます。",ephemeral:true});
 if(i.commandName==="security-status")return i.reply("🛡️ 稼働中\n大量メッセージ: "+CFG.max+"件/"+CFG.window/1000+"秒\n連投: "+CFG.dupMax+"回/"+CFG.dupWindow/1000+"秒\nタイムアウト: 10分");
 if(i.commandName==="security-reset"){messages.clear();duplicates.clear();punished.clear();return i.reply("🧹 検知履歴をリセットしました。");}
});
client.login(TOKEN).catch(e=>{console.error("Discord login failed:",e.message);process.exit(1);});
