require('dotenv').config();

const { Telegraf, session } = require('telegraf');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

if (!process.env.BOT_TOKEN) throw new Error('BOT_TOKEN missing');

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

const users = new Map();

const templates = {
  classic: 'kachibi.png',
  throne: 'throne.png',
  moon: 'moon.png',
  laser: 'laser.png'
};

function getUser(id, name) {
  if (!users.has(id)) users.set(id, { id, name, xp: 0 });
  return users.get(id);
}

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function makeMeme(file, text) {
  const canvas = createCanvas(1024, 1024);
  const c = canvas.getContext('2d');
  const img = await loadImage(path.join(__dirname, 'templates', file));
  c.drawImage(img, 0, 0, 1024, 1024);
  c.font = 'bold 52px Arial';
  c.fillStyle = 'white';
  c.strokeStyle = 'black';
  c.lineWidth = 5;
  c.textAlign = 'center';
  c.strokeText(text, 512, 940, 920);
  c.fillText(text, 512, 940, 920);
  c.font = 'bold 26px Arial';
  c.fillText('@KachibiInu', 860, 50);
  const out = path.join(__dirname, 'meme.png');
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  return out;
}

bot.start((ctx) => {
  const u = getUser(ctx.from.id, ctx.from.first_name);
  ctx.reply(`🐺 Welcome ${u.name} to Kachibi Inu! Use /missions /xp /leaderboard /meme`);
});

bot.command('missions', (ctx) => {
  ctx.reply('🔥 Daily Mission:\n1. Like post\n2. Repost\n3. Comment KACHIBI\n4. Invite friends\nUse /done when finished');
});

bot.command('done', (ctx) => {
  const u = getUser(ctx.from.id, ctx.from.first_name);
  u.xp += 10;
  ctx.reply(`✅ +10 XP | Total: ${u.xp}`);
});

bot.command('xp', (ctx) => {
  const u = getUser(ctx.from.id, ctx.from.first_name);
  ctx.reply(`🏅 ${u.name}: ${u.xp} XP`);
});

bot.command('leaderboard', (ctx) => {
  const board = [...users.values()].sort((a, b) => b.xp - a.xp).slice(0, 10)
    .map((u, i) => `${i + 1}. ${u.name} - ${u.xp} XP`).join('\n');
  ctx.reply('🏆 Leaderboard\n' + (board || 'No users yet'));
});

bot.command('template', (ctx) => {
  const name = ctx.message.text.replace('/template', '').trim().toLowerCase();
  if (!templates[name]) return ctx.reply('Templates: classic, throne, moon, laser');
  ctx.session.template = name;
  ctx.reply(`🎨 Template set: ${name}`);
});

bot.command('meme', async (ctx) => {
  try {
    const text = ctx.message.text.replace('/meme', '').trim();
    if (!text) return ctx.reply('Use: /meme your caption');
    const chosen = ctx.session.template || 'classic';
    const out = await makeMeme(templates[chosen], text);
    const u = getUser(ctx.from.id, ctx.from.first_name);
    u.xp += 5;
    await ctx.replyWithPhoto({ source: out }, { caption: `🐺 Meme created! +5 XP` });
  } catch (e) {
    console.error(e);
    ctx.reply('Error generating meme');
  }
});

bot.command('randommeme', async (ctx) => {
  const captions = ['When you bought early', 'Shiba watching Kachibi pump', 'Diamond paws only', 'Solana just got dangerous'];
  const keys = Object.keys(templates);
  const out = await makeMeme(templates[rand(keys)], rand(captions));
  await ctx.replyWithPhoto({ source: out }, { caption: '🎲 Random Meme' });
});

bot.command('contest', (ctx) => ctx.reply('🏆 Meme contest entered! Post with #KachibiMeme'));

bot.launch();
console.log('Kachibi Final Bot v2 Live');
