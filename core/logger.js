const chalk = require('chalk');
const moment = require('moment');

function timestamp() {
  return chalk.gray(`[${moment().format('HH:mm:ss')}]`);
}

module.exports = {
  info: (msg) => console.log(`${timestamp()} ${chalk.blue('[INFO]')} ${msg}`),
  warn: (msg) => console.log(`${timestamp()} ${chalk.yellow('[WARN]')} ${msg}`),
  error: (msg) => console.log(`${timestamp()} ${chalk.red('[ERROR]')} ${msg}`),
  success: (msg) => console.log(`${timestamp()} ${chalk.green('[SUCCESS]')} ${msg}`),
  custom: (label, color, msg) => console.log(`${timestamp()} ${chalk.keyword(color)(`[${label}]`)} ${msg}`)
};