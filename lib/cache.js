
var redis;
var ns;

exports.setup = function setup( app ) {
  redis = app.get('redis');
  ns = redis.ns + 'cache:';
};

exports.progressive = function progressive(key, time, wait, fetch, callback) {
  var now = new Date().getTime();
  redis.hgetall(ns+key, function(err, cache) {
    if(err) return callback(err);
    var reload = false;
    var data;
    var status;
    if(!cache) {
      reload = true;
      status = 'miss';
    } else {
      data = JSON.parse(cache.data);
      var age = now - parseInt(cache.time, 10);
      if(age > time*1000) {
        status = 'stale';
        reload = true;
      } else {
        status = 'hot';
      }
    }
    if(!reload) {
      callback(null, {cache: status, data: data});
    } else {
      redis.sadd(ns+'jobs', key, function(err, added) {
        if(err) return callback(err);
        if(!wait) {
          callback(null, {cache: status, data: data});
        }
        if(added) {
          fetch(function(data) {
            var now = new Date().getTime();
            redis.multi()
              .hmset(ns+key, {
                time: now,
                data: JSON.stringify(data)
              })
              .srem(ns+'jobs', key)
              .exec(function(err, results) {
                if(err) throw err;
                if(wait) {
                  callback(null, {cache: 'hot', data: data});
                }
              });
          });
        } else if(wait) {
          var check = function check() {
            redis.sexists(ns+'jobs', key, function(err, exists) {
              if(err) {
                return callback(err);
              }
              if(!exists) {
                this.progressive(key, time, wait, fetch, callback);
              } else {
                setTimeout(check, 100);
              }
            });
          };
          check();
        }
      });
    }
  });
};
