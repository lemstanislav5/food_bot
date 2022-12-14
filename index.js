const { Telegraf } = require('telegraf');
const bot = new Telegraf('5670834206:AAF98z1JjIUXG51SmOxBp701GgESvSG1Ft0');

const Datastore = require('nedb');
const db = new Datastore({filename : 'users'});
db.loadDatabase();

const fs = require('fs');

const path = require('path');
const buildPathHtml = path.resolve('./build.html');

bot.start((ctx) => ctx.reply('Welcome'));
bot.help((ctx) => ctx.reply('Send me a sticker'));
bot.on('sticker', (ctx) => ctx.reply('👍'));
bot.hears('Помощь', (ctx) => ctx.reply(`
  - Д.175..28.09..курица с рисом, макараоны с сыром (добавить)
- У.175 (удалить)
- П.20.01,30.09 (показать)
- Р.175..28.09..курица с рисом, макараоны с сыром (редактировать)
`));
bot.on('text', (ctx) => {
  if(ctx.botInfo.id != '5670834206') return ctx.reply('Я тебя не знаю!');
  const message = ctx.update.message.text,
        id = ctx.update.message.message_id,
        io = x => (message.indexOf(x) != -1),
        date = new Date();
  if(io('Д.')){
    const data = message.replace('Д.', ' ').split('..')
    if(data.length !== 2) return ctx.reply('Неверный формат. Пример: "д.20.08..курица с рисом"');
    const newDate = Date.parse(date.getFullYear() + '-' + data[0].split('.')[1].replace(/ /g,'') + '-' + data[0].split('.')[0].replace(/ /g,''));
    db.insert({id, date: newDate, text: data[1]}, function(err, newDoc){   
      if(err) return ctx.reply('Ошибка записи в базу!');
      ctx.reply('Данные успешно добавлены!');
    });
  }
  if(io('У.')){
    let del_id = parseInt(message.replace('У.', ' ').replace(/ /g,''));
    db.remove({id: del_id}, {}, function(err, doc){
      if(err) console.log(err);
      console.log(doc);
      ctx.reply(`Запись № ${del_id} удалена!`);
    });
  }
  if(io('Р.')){
    //Р. 255.. 28.09.. курица с рисом, макараоны с сыром
    let data = message.replace('Р.', ' ').split('..');
    if(data.length !== 3) return ctx.reply('Неверный формат. Пример: "Р. 255.. 28.09.. курица с рисом, макараоны с сыром"');
    const update_id = parseInt(data[0]);
    const newDate = Date.parse(date.getFullYear() + '-' + data[1].split('.')[1].replace(/ /g,'') + '-' + data[1].split('.')[0].replace(/ /g,''));
    console.log(update_id, newDate, data[2])
    //.replace(/ /g,''))
    db.update({ id: update_id }, { $set: { date: newDate,  text: data[2]} }, {}, function (err, doc) {
      if(err) console.log(err);
      ctx.reply('Данные успешно обновлены!');
    });
  }
  if(io('П.')){
    let [start, end] = message.replace('П.', ' ').replace(/ /g,'').split(',')
    start = Date.parse(date.getFullYear() + '-' + start.split('.')[1].replace(/ /g,'') + '-' + start.split('.')[0].replace(/ /g,''));
    end = Date.parse(date.getFullYear() + '-' + end.split('.')[1].replace(/ /g,'') + '-' + end.split('.')[0].replace(/ /g,''));
    if(start !== undefined && end !== undefined){
      let res = db.find({ $where: function(){ 
        if(typeof this.date === 'number'){
          return (start <= this.date <= end)? true: false;
        } else {
          return false;
        }
      } 
      }, function(err, docs){
        if(err) return console.log(err);  
        const createTable = (rows) => `
          <table>
            <tr>
              <th>id</th>
              <th>Дата</th>
              <th>Продукты</th>
            </tr>
            ${rows}
          </table>
        `; 
        const createHtml = (table) => `
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body{
                  color: #fff;
                  background: rgb(12, 3, 71)
                }
                table {
                  width: 100%;
                }
                tr {
                  text-align: left;
                  border: 1px solid black;
                }
                th, td {
                  padding: 15px;
                }
                tr:nth-child(odd) {
                  background: rgb(42, 41, 41)
                }
                tr:nth-child(even) {
                  background: rgb(7, 4, 28)
                }
              </style>
            </head>
            <body>
              ${table}
            </body>
          </html>
        `;         
        const doesFileExist = (filePath) => {
          try {
            fs.statSync(filePath); 
            return true;
          } catch (error) {
            return false;
          }
        };
        
        try {
          if (doesFileExist(buildPathHtml)) {
              console.log('Старй файл HTML удален!');
              fs.unlinkSync(buildPathHtml);
          }

          const rows = docs.map(item => {
            let date = new Date(item.date)
            let day = date.getDate();
            day = (day < 10)? '0' + day: day;
            let month = parseInt(date.getMonth()) + 1;
            month = (month< 10)? '0' + month: month;
            let year = date.getFullYear();
            return '<tr>' + '<td>'+item.id +'</td><td>'+ day + '.' + month + '.' + year +'</td><td>'+item.text+'</td>' + '</tr>'
          }).join('');
          const table = createTable(rows);
          const html = createHtml(table);
          fs.writeFileSync(buildPathHtml, html);
          console.log('Файл HTML создан!');
        } catch (error) {
          console.log('Error создания HTML файла!', error);
        }
        ctx.replyWithDocument({source: buildPathHtml});
      });

    } 
  }
});
bot.launch();

//! Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
