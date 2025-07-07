const { exec } = require("child_process");
const util = require("util");

module.exports = {
  name: 'eval',
  desc: 'ngetes jir',
  category: 'utility',
  async run(ctx) {
      const args = ctx.message.text.split(' ').slice(1)
      let woi = args[0]
      let evalCmd = "";
      try {
        evalCmd = /await/i.test(woi)
          ? eval("(async() => { " + woi + " })()")
          : eval(woi);
      } catch (e) {
        evalCmd = e;
      }
      new Promise((resolve, reject) => {
        try {
          resolve(evalCmd);
        } catch (err) {
          reject(err);
        }
      })
        ?.then((res) => ctx.reply(util.format(res)))
        ?.catch((err) => ctx.reply(util.format(err)));
  }
}