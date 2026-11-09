var Service = require('webos-service');
var readFeed = require('./feeds.cjs').readFeed;
var service = new Service('com.cinemanatv.app.news');
service.register('feed', function(message) {
  readFeed(message.payload && message.payload.id, function(error,xml){
    message.respond(error?{returnValue:false,errorCode:1,errorText:'Feed unavailable'}:{returnValue:true,xml:xml});
  });
});
