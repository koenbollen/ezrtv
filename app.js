
var _ = require('lodash');
var async = require('async');
var bodyParser = require('body-parser');
var express = require('express');
var fs = require('fs');
var jade = require('jade');
var morgan = require('morgan');
var path = require('path');
var redis = require('redis');

var cache = require('./lib/cache');
var eztv = require('./lib/eztv');

var config = require('./config');

config.init();

var db = redis.createClient(config.get('redis:port'), config.get('redis:host'), {detect_buffers: true});
db.ns = config.get('redis:namespace') || 'ezrtv:';

var app = express();
app.set('redis', db);

cache.setup(app);


app.use(bodyParser.json());

var env = config.get('NODE_ENV');
if(env == 'development') {

  app.get('/static/js/templates.js', function(req, res) {
    var dir = __dirname + '/views/client';
    var data = 'var jade = {};\n\n';
    data += 'jade.escape =  function(html){\
        var result = String(html)\
          .replace(/&/g, \'&amp;\')\
          .replace(/</g, \'&lt;\')\
          .replace(/>/g, \'&gt;\')\
          .replace(/"/g, \'&quot;\');\
        if (result === \'\' + html) return html;\
        else return result;\
      }\n\n';
    fs.readdir(dir, function(err, files) {
      if(err) throw err;
      async.each(files, function(file, callback) {
        fs.readFile(path.join(dir, file), function(err, src) {
          if(err) throw err;
          var js = jade.compileClient(src, {pretty:true});
          data += 'jade.'+path.basename(file, '.jade')+' = '+js+'\n\n';
          callback();
        });
      }, function(err) {
        res.setHeader('Content-Type', 'application/javascript');
        res.send(data);
      });
    });
  });
  app.use('/static', express.static(__dirname + '/public'));
  app.use(morgan('dev'));

} else if(env == 'production') {

  app.use(morgan('default'));
  app.enable('trust proxy');

} else {
  console.error('invalid environment via NODE_ENV: ' + env);
  process.exit(1);
}

app.set('title', 'EZRTV');

app.use(function(req, res, next) {

  res.locals = {
    _: _,
    static: function static(resource) {
      return path.join('/static/', resource);
    },
    title: app.get('title')
  };
  res.assign = function(values) {
    _.assign(res.locals, values);
  };

  next();
});

app.get('/', function(req, res) {
  res.render('index.jade');
});

app.get('/api/shows/list', function(req, res) {
  var wait = req.headers['x-wait'] == 'true';

  cache.progressive('showlist', 600, wait, function(callback) {
    var e = new eztv.EZTV();
    e.list_shows(function(err, shows) {
      if(err) throw err;
      callback(shows);
    });
  }, function(err, cache) {
    if(err) throw err;
    cache.code = 'ok';
    res.send(cache);
  });

});


app.get('/shows', function(req, res) {
  res.render('showlist.jade');
});

app.listen(process.env.PORT || config.get('port'));
