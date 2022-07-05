var express = require('express');
var app = express();
const {
  Telegraf,
  Markup
} = require('telegraf');
var token = 'token' 
var mongo = 'mongodb'
const ms = require("ms");
const axios = require('axios')
const bot = new Telegraf(token);
const {
  TelegramLogin
} = require('node-telegram-login');
var btoa = require('btoa');
const requestIp = require('request-ip');
app.use(requestIp.mw())
const TelegramAuth = new TelegramLogin(token);
var path = require('path')
app.use('/login/assets', express.static('assets'));
app.set('views', path.join(__dirname, '/views'))
app.set('view engine', 'ejs');
const fs = require('fs');
const {
  Database
} = require("quickmongo");
const db = new Database(mongo);
db.on("ready", () => {
  console.log("Connected to the database");
});
db.connect();
var chatt;
var chatid;
var url = 'urlhere'
var apikey = 'ipqualityscore apikey'
var username = 'bot username'
bot.on('new_chat_members', async (ctx) => {
  const time = ms('30s')
  console.log(ctx.message.new_chat_members);
  console.log(ctx.chat.id);
  chatt = ctx.message.new_chat_members[0].id
  chatid = ctx.chat.id
  if (ctx.message.new_chat_members[0].is_bot === false) {
    const keyboard = Markup.inlineKeyboard([
      Markup.button.login(`Verify`, `${url}/login/telegram`, {
        bot_username: `${username}`,
        request_write_access: true
      }),
      Markup.button.callback('Delete', 'delete')
    ])
    const {
      message_id
    } = await ctx.reply(`Hello ${ctx.message.new_chat_members[0].first_name}!\nKindly Verify yourself by clicking at verify button so that you can access our group!\nYou have 30 seconds to verify yourself or else you will be temp-banned for 30 seconds!`, keyboard)

    bot.telegram.restrictChatMember(ctx.chat.id, ctx.message.new_chat_members[0].id, {
      "can_send_messages": false
    })

      .then(async () => {
        setTimeout(async () => {
          var timee = Math.floor(Date.now() / 1000) + 31;
          ctx.telegram.deleteMessage(ctx.chat.id, message_id);
          const result = await db.get(`verification-${chatt}`)
          if (result == null) {
            await axios.get(`https://api.telegram.org/bot${token}/banChatMember?chat_id=${ctx.chat.id}&user_id=${ctx.message.new_chat_members[0].id}&until_date=${timee}`)
          } else {

          }
        }, time)
      })
  }
});
async function downloadImage(url, filepath) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });
  return new Promise((resolve, reject) => {
    response.data.pipe(fs.createWriteStream(filepath))
      .on('error', reject)
      .once('close', () => resolve(filepath));
  });
}
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});
app.get('/login/telegram', TelegramAuth.defaultMiddleware(), async (req, res) => {
  const requ = await axios.get(`https://ipqualityscore.com/api/json/ip/${apikey}/${req.clientIp}?strictness=0&allow_public_access_points=true&user_agent=${req.headers['user-agent']}&user_language=${req.headers['accept-language']};`);
  if (requ.data.vpn === false || requ.data.proxy === false) {
    const bip = btoa(req.clientIp)
    const info = await db.get(`users-${bip}`);
    let ID = chatt
    let gid = chatid
    if (info == null) {
      if (req.query.id === `${ID}`) {
        await db.push(`users-${bip}`, ID);
        downloadImage(req.query.photo_url, `./assets/image.jpg`)
        bot.telegram.restrictChatMember(gid, ID, {
          "can_send_messages": true
        })
        await db.set(`verification-${ID}`, "true", 60)
          .then(async () => {
            setTimeout(async () => {
              await res.render('index', {
                name: req.query.first_name
              })
            }, 3000)
          })
      } else {
        res.send(`Verification Failed!`);
      }
    } else if (info != null) {
      if (info[0] == `${ID}`) {
        if (!req.query.photo_url) {
          downloadImage(`https://cdn.discordapp.com/attachments/991570457675448331/992720669697654794/unknown.png`, `./assets/image.jpg`)
          bot.telegram.restrictChatMember(gid, ID, {
            "can_send_messages": true
          })
          await db.set(`verification-${ID}`, "true", 60)
            .then(async () => {
              setTimeout(async () => {
                await res.render('index', {
                  name: req.query.first_name
                })
              }, 3000)
            })
        } else {
          downloadImage(req.query.photo_url, `./assets/image.jpg`)
          bot.telegram.restrictChatMember(gid, ID, {
            "can_send_messages": true
          })
          await db.set(`verification-${ID}`, "true", 60)
            .then(async () => {
              setTimeout(async () => {
                await res.render('index', {
                  name: req.query.first_name
                })
              }, 3000)
            })
        }
      } else {
        db.push(`users-${bip}`, req.query.id)
        res.send(`DON'T JOIN WITH ALTS!`)
      }
    } else {
      db.push(`users-${bip}`, req.query.id)
      res.send('Verification failed')
    }
  } else {
    res.send('VPN/PROXY DETECTED')
  }
});

bot.command('deleteAll', async (ctx) => {
  let res = await ctx.reply('deleting');
  console.log(res);
  for (let i = res.message_id; i >= 0; i--) {
    try {
      let res = await ctx.telegram.deleteMessage(ctx.chat.id, i);
      console.log(res);
    } catch (e) {
      console.error(e);
    }
  }
});
bot.launch()
app.listen(3000, () => {
  console.log("Server started on port 3000")
});
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
process.on('uncaughtException', (err, origin) => {
  console.log(" [Anti-crash] :: Uncaught Exception/Catch")
  console.log(err, origin)
})
process.on('uncaughtExceptionMonitor', (err, origin) => {
  console.log(" [Anti-crash] :: Uncaught Exception/Catch (MONITOR)")
  console.log(err, origin)
})
process.on('multipleResolves', (type, promise, reason) => {
  console.log(" [Anti-crash] :: Multiple Resolves")
  console.log(type, promise, reason)
})