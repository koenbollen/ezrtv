(function (window, document) {

  var updatelist = function updatelist(shows) {
    var list = document.getElementById('showlist');
    var html = '';
    shows.forEach(function(s) {
      html += jade.showlist_show(s);
    });
    list.innerHTML = html;

  };

  var fetchshows = function fetchshows( wait ) {
    var r = new XMLHttpRequest();
    r.open("GET", "/api/shows/list", true);
    r.setRequestHeader('X-Wait', !!wait);
    r.onreadystatechange = function () {
      if (r.readyState != 4) return;
      var json = r.status == 200 ? JSON.parse(r.responseText) : null;
      if(json && json.code == 'ok' ) {
        console.log(json);
        if(json.data) {
          updatelist(json.data);
        }
        if(json.cache != 'hot') {
          fetchshows(true);
        }
      } else {
        alert( 'failed to fetch showlist: ' + (json?json.message:'unknown') );
      }
      r.onreadystatechange = null;
    };
    r.send();
  };

  fetchshows(false);

}(this, this.document));
