require('dotenv').config();

const { Telegraf, session } = require('telegraf');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

if (!process.env.BOT_TOKEN) throw new Error('BOT_TOKEN missing');

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session({ defaultSession: () => ({ template: 'classic' }) }));

const users = new Map();

// Each template defines the file and the white text box region (in pixels at native 701x561 resolution)
const templates = {
  classic: {
    file: 'kachibi.png',
    box: { x: 56, y: 220, w: 450, h: 195 }   // white speech bubble
  },
  throne: {
    file: 'throne.png',
    box: { x: 375, y: 230, w: 300, h: 210 }   // white rectangular frame (right side)
  },
  moon: {
    file: 'moon.png',
    box: { x: 48, y: 248, w: 338, h: 200 }    // white rectangular frame (left-center)
  },
  laser: {
    file: 'laser.png',
    box: { x: 35, y: 238, w: 365, h: 210 }    // white rectangular frame (left side)
  }
};

function getUser(id, name) {
  if (!users.has(id)) users.set(id, { id, name, xp: 0, lastClaim: 0 });
  return users.get(id);
}

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Wrap text into lines that fit within maxWidth
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function makeMeme(templateKey, text) {
  const tmpl = templates[templateKey] || templates.classic;
  const img = await loadImage(path.join(__dirname, 'templates', tmpl.file));

  // Draw at native image size to keep aspect ratio
  const imgW = img.width || 701;
  const imgH = img.height || 561;
  const canvas = createCanvas(imgW, imgH);
  const c = canvas.getContext('2d');
  c.drawImage(img, 0, 0, imgW, imgH);

  // Text box coords
  const { x, y, w, h } = tmpl.box;
  const padding = 12;
  const innerX = x + padding;
  const innerY = y + padding;
  const innerW = w - padding * 2;
  const innerH = h - padding * 2;

  // Auto-size font to fit text in box
  let fontSize = 38;
  let lines;
  do {
    c.font = `bold ${fontSize}px Arial`;
    lines = wrapText(c, text, innerW);
    const totalH = lines.length * fontSize * 1.2;
    if (totalH <= innerH || fontSize <= 14) break;
    fontSize -= 2;
  } while (true);

  const lineH = fontSize * 1.2;
  const totalTextH = lines.length * lineH;
  const startY = innerY + (innerH - totalTextH) / 2 + fontSize;

  // Draw text in dark color for readability on white box
  c.font = `bold ${fontSize}px Arial`;
  c.fillStyle = '#111111';
  c.strokeStyle = 'rgba(255,255,255,0.4)';
  c.lineWidth = 2;
  c.textAlign = 'center';
  const centerX = x + w / 2;

  lines.forEach((line, i) => {
    const lineY = startY + i * lineH;
    c.strokeText(line, centerX, lineY, innerW);
    c.fillText(line, centerX, lineY, innerW);
  });

  const out = path.join(__dirname, 'meme.png');
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  return out;
}

bot.start((ctx) => {
  const u = getUser(ctx.from.id, ctx.from.first_name);
  ctx.reply(`🐺 Welcome ${u.name} to Kachibi Inu!\n\nCommands:\n/missions - Daily missions & XP\n/done - Claim daily XP\n/xp - Check your XP\n/leaderboard - Top holders\n/template - Set meme template\n/meme - Generate a meme\n/randommeme - Random meme`);
});

bot.command('missions', (ctx) => {
  const u = getUser(ctx.from.id, ctx.from.first_name);
  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000;
  const elapsed = now - (u.lastClaim || 0);
  const ready = elapsed >= cooldown;
  const status = ready
    ? '✅ Ready to claim! Use /done after completing.'
    : (() => {
        const r = cooldown - elapsed;
        const h = Math.floor(r / 3600000);
        const m = Math.floor((r % 3600000) / 60000);
        return `⏳ Next claim in ${h}h ${m}m`;
      })();
  ctx.reply(`🔥 Daily Missions:\n1. Like the latest post\n2. Repost\n3. Comment KACHIBI\n4. Invite 2 friends\n\n${status}`);
});

bot.command('done', (ctx) => {
  const u = getUser(ctx.from.id, ctx.from.first_name);
  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000;
  const elapsed = now - (u.lastClaim || 0);
  if (elapsed < cooldown) {
    const remaining = cooldown - elapsed;
    const hrs = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    return ctx.reply(`⏳ Already claimed today! Come back in ${hrs}h ${mins}m.\nComplete your missions first: /missions`);
  }
  u.lastClaim = now;
  u.xp += 10;
  ctx.reply(`✅ +10 XP claimed! Total: ${u.xp} XP\nSee you tomorrow for more missions! 🐺`);
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
  if (!ctx.session) ctx.session = {};
  ctx.session.template = name;
  ctx.reply(`🎨 Template set: ${name}`);
});

bot.command('meme', async (ctx) => {
  try {
    const text = ctx.message.text.replace('/meme', '').trim();
    if (!text) return ctx.reply('Use: /meme your caption');
    const chosen = (ctx.session && ctx.session.template) || 'classic';
    const out = await makeMeme(chosen, text);
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
  try {
    const out = await makeMeme(rand(keys), rand(captions));
    await ctx.replyWithPhoto({ source: out }, { caption: '🎲 Random Meme' });
  } catch (e) {
    console.error(e);
    ctx.reply('Error generating random meme');
  }
});

bot.command('contest', (ctx) => ctx.reply('🏆 Meme contest entered! Post with #KachibiMeme'));

bot.launch();
console.log('Kachibi Bot v3 Live - Template text boxes active');
