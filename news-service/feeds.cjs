var https = require('https');
var urlTools = require('url');
var FEEDS = Object.freeze({
  film: 'https://www.theguardian.com/film/rss',
  television: 'https://www.theguardian.com/tv-and-radio/rss',
  deadline: 'https://deadline.com/feed/',
  hollywood: 'https://www.hollywoodreporter.com/c/movies/movie-news/feed/',
  netflix: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCWOA1ZGywLbqmigxE4Qlvuw',
  warner: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCjmJDM5pRKbUlVIzDYYWb6g',
});
// Device path uses ES5 callbacks: Node 0.10/0.12 has no WHATWG URL or Promise.
var cache=Object.create(null),pending=Object.create(null);
function allowedFeedUrl(value){
 if(typeof value!=='string')return false;
 var parsed;try{parsed=urlTools.parse(value)}catch(_){return false}
 if(parsed.protocol!=='https:'||parsed.auth||(parsed.port&&parsed.port!=='443'))return false;
 return Object.keys(FEEDS).some(function(key){return urlTools.parse(FEEDS[key]).hostname===parsed.hostname});
}
function download(value,hops,callback){
 if(!allowedFeedUrl(value))return callback(Error('Invalid feed host'));
 var options=urlTools.parse(value),finished=false,size=0,chunks=[],timer,request;
 options.headers={'User-Agent':'CinemanaTV/0.8 public RSS reader',Accept:'application/rss+xml, application/atom+xml, text/xml'};
 function done(error,xml){if(finished)return;finished=true;clearTimeout(timer);callback(error,xml)}
 try{request=https.get(options,function(response){
  if([301,302,307,308].indexOf(response.statusCode)!==-1&&response.headers.location&&hops<2){response.resume();var redirect;try{redirect=urlTools.resolve(value,response.headers.location)}catch(_){done(Error('Invalid feed redirect'));return}clearTimeout(timer);download(redirect,hops+1,done);return}
  if(response.statusCode!==200){response.resume();done(Error('Feed unavailable'));return}
  response.on('data',function(chunk){size+=chunk.length;if(size>1500000){done(Error('Feed too large'));request.abort()}else chunks.push(chunk)});
  response.on('error',function(){done(Error('Feed unavailable'))});
  response.on('aborted',function(){done(Error('Feed interrupted'))});
  response.on('end',function(){done(null,Buffer.concat(chunks).toString('utf8'))});
 });request.on('error',function(){done(Error('Feed unavailable'))});
 timer=setTimeout(function(){done(Error('Feed timeout'));request.abort()},8000);
 }catch(error){done(Error('Feed unavailable'))}
}
function readFeedCallback(id,callback){
 if(!Object.prototype.hasOwnProperty.call(FEEDS,id)){callback(Error('Unknown feed'));return}
 var saved=cache[id];if(saved&&Date.now()-saved.time<600000){callback(null,saved.xml);return}
 if(pending[id]){pending[id].push(callback);return}pending[id]=[callback];
 download(FEEDS[id],0,function(error,xml){
  if(!error&&!/<(?:rss|feed)\b/i.test(xml))error=Error('Invalid feed');
  if(!error)cache[id]={time:Date.now(),xml:xml};
  var listeners=pending[id];delete pending[id];listeners.forEach(function(listener){listener(error,xml)});
 });
}
function readFeed(id,callback){
 if(typeof callback==='function'){readFeedCallback(id,callback);return}
 // Promise convenience is used only by desktop preview/tests, never the TV service.
 return new Promise(function(resolve,reject){readFeedCallback(id,function(error,xml){if(error)reject(error);else resolve(xml)})});
}
module.exports={FEEDS:FEEDS,readFeed:readFeed,allowedFeedUrl:allowedFeedUrl};
