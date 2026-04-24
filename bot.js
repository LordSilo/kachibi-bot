require('dotenv').config();
const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);

const users = new Map();

function getUser(id, name) {
  if (!users.has(id)) users.set(id, { id, name, xp: 0, invites: 0 });
  return users.get(id);
}

bot.start((ctx) => {
  const u = getUser(ctx.from.id, ctx.from.first_name);
  ctx.reply(`🐺 Welcome ${u.name} to Kachibi Inu!\nThe cousin has arrived on Solana.\nUse /missions /xp /leaderboard`);
});

bot.command('missions', (ctx) => {
  ctx.reply('🔥 Daily Mission:\n1. Like post\n2. Repost\n3. Comment KACHIBI\n4. Invite 2 friends\nThen use /done');
});

bot.command('done', (ctx) => {
  const u = getUser(ctx.from.id, ctx.from.first_name);
  u.xp += 10;
  ctx.reply(`✅ Mission complete. +10 XP\nTotal XP: ${u.xp}`);
});

bot.command('xp', (ctx) => {
  const u = getUser(ctx.from.id, ctx.from.first_name);
  ctx.reply(`🏅 ${u.name} has ${u.xp} XP`);
});

bot.command('leaderboard', (ctx) => {
  const top = [...users.values()]
    .sort((a,b)=>b.xp-a.xp)
    .slice(0,10)
    .map((u,i)=>`${i+1}. ${u.name} - ${u.xp} XP`)
    .join('\n');
  ctx.reply(`🏆 Pack Leaderboard\n${top || 'No players yet.'}`);
});

bot.command('announce', (ctx) => {
  if (ctx.chat.type.includes('group')) {
    ctx.reply('📣 Kachibi update incoming. Stay ready.');
  }
});

bot.launch();
console.log('Kachibi bot live');
