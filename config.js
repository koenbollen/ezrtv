var nconf = require('nconf');

nconf.init = function init() {
  this.argv()
    .env()
    .file('./localconfig.json')
    .defaults({
      NODE_ENV: 'development',
      port: 3000,
      redis: {
        port: null,
        host: null
      }
    });
  return this;
}.bind(nconf);

module.exports = nconf;
