// Run before polyfills: model/year alone does not describe an upgraded TV engine.
export function selectProfile(env){
 var ua=String(env.userAgent||''),match=/Chrome\/(\d+)/.exec(ua),chrome=match?Number(match[1]):0;
 var webkit=/AppleWebKit\/(\d+(?:\.\d+)?)/.exec(ua);
 var oldWebkit=!chrome&&/WebAppManager/.test(ua)&&webkit&&Number(webkit[1])<600;
 var netcast=/NetCast/i.test(ua)&&!/WebAppManager|Web0S|webOS/i.test(ua);
 var c=env.features||{};
 var modern=!netcast&&chrome>=88&&c.grid&&c.variables&&c.aspectRatio&&c.flex;
 return {version:typeof __ROMANA_VERSION__==='string'?__ROMANA_VERSION__:'1.0.0',mode:netcast?'unsupported':modern?'modern':'compatible',engine:chrome?'Chromium '+chrome:oldWebkit?'WebKit '+webkit[1]:'unknown',chrome:chrome,
  support:netcast?'different-platform':oldWebkit?'experimental':'targeted',
  viewport:{width:Number(env.width)||1920,height:Number(env.height)||1080},
  features:c,media:env.media||{},limits:modern?{rows:0,cards:0,images:6,genres:3,heroMs:6500}:{rows:5,cards:12,images:3,genres:1,heroMs:10000}};
}
