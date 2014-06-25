
var _ = require('lodash');
var async = require('async');
var cheerio = require('cheerio');
var request = require('request');
var url = require('url');

if(process.env.NODE_ENV !== 'production') {
  var replay = require('replay');
}

function EZTV() {
  this.base = 'http://eztv.it/';
  return this;
}
EZTV.prototype = {
  resolve: function resolve( path ) {
    return url.resolve(this.base, path);
  },
  login: function login( username, password, callback ) {
    if(!callback) {
      this.username = username;
      this.token = password;
      return;
    }
    this.username = username;
    this.token = undefined;
    request({
      method: 'POST',
      url: this.resolve('/login/'),
      form: {
        loginname: username,
        password: password,
        submit: 'Login'
      }
    }, function(err, resp, body) {
      if(err) return callback(err);
      _.each(resp.headers['set-cookie'], function(cookie) {
        var m = /^password=([0-9a-f]+)/.exec(cookie);
        console.log(cookie);
        if(m) {
          this.token = m[1];
          return false;
        }
      }.bind(this));
      callback(err, this.token);
    });
  },
  mypage: function mypage(callback) {
    request({
      method: 'GET',
      url: this.resolve('/myshows/'),
      headers: {
        'Cookie': 'username='+this.username+'; password='+this.token
      }
    }, function(err, resp, body) {
      if(err) return callback(err);
      var $ = cheerio.load(body);
      var showsTags = $('td.section_post_header > a.thread');
      var shows = [];
      showsTags.each(function(i, e) {
        var tag = $(e);
        var show = {};
        show.title = tag.text();
        show.href = tag.attr('href');
        var m = /^\/shows\/(\d+)\/([^\/]+)\/$/.exec(show.href);
        if(!m) {
          return true;
        }
        show.id = parseInt(m[1], 10);
        show.slug = m[2];
        show.status = $(tag.parent().next().closest('td')).text();
        var tr = tag.parentsUntil('tr').next('tr');
        show.unwatched = [];
        while(tr.attr('name') == 'hover') {
          var ep = {};
          var atags = $('a', tr);
          if(atags.length >= 2) {
            m = /shows\/(\d+)\/watched/.exec($(atags[0]).attr('href'));
            if(m) {
              ep.id = parseInt(m[1], 10);
            }
            ep.name = $(atags[1]).text();
            ep.links = [];
            for( var j = 2; j < atags.length; j++ ) {
              var a = $(atags[j]);
              ep.links.push(a.attr('href'));
            }
            show.unwatched.push(ep);
          }
          tr = tr.next('tr');
        }
        shows.push(show);
      });
      callback(undefined, shows);
    });
  },
  get_episodes: function get_episodes(show_id, callback) {
    if( _.isObject(show_id) ) {
      show_id = show_id.id;
    }
    request({
      method: 'GET',
      url: this.resolve('/shows/'+id+'/')
    }, function(err, resp, body) {
      if(err) return callback(err);
      var $ = cheerio.load(body);
      var eps = [];
      $('table.forum_header_noborder > tr[name="hover"]').each(function(i, e) {
        var tr = $(e);
        var ep = {};
        ep.name = $('a.epinfo', tr).text();
        ep.links = $( 'a', tr.children('td')[2] ).map(function(i, e) {
          return $(e).attr('href');
        });
        eps.push(ep);
      });
      callback(undefined, eps);
    });
  },
  list_shows: function list_shows(callback) {
    request({
      method: 'GET',
      url: this.resolve('/showlist/')
    }, function(err, resp, body) {
      if(err) return callback(err);
      var $ = cheerio.load(body);
      var shows = [];

      $('tr[name="hover"]').each(function(i, e) {
        var tr = $(e);
        var show = {};
        var a = $('a.thread_link', tr);
        show.name = a.text();
        show.href = a.attr('href');
        var m = /^\/shows\/(\d+)\/([^\/]+)\/$/.exec(show.href);
        if(!m) {
          return true;
        }
        show.id = parseInt(m[1], 10);
        show.slug = m[2];
        show.status = $(a.parent().next().closest('td')).text();
        shows.push(show);
      });

      callback(undefined, shows);
    });
  },
};

exports.EZTV = EZTV;

//var e = new EZTV();
//e.login('koenbollen', '7ff404fe48caff60e9769acee587ab5a');
//e.list_shows(console.log);