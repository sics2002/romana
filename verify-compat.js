import {strict as assert} from 'node:assert';
import {readFile, readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {parse} from 'acorn';
import postcss from 'postcss';

const root = path.resolve(process.argv[2] || 'release/romana-webos-raw');
const read = file => readFile(path.join(root, file), 'utf8');
const references = new Set();
async function localRef(value, from = 'index.html') {
  if (value.startsWith('#') || /^data:/i.test(value)) return;
  const ref = decodeURIComponent(value.split(/[?#]/)[0]);
  assert(ref && !/^(?:[/\\]|[a-z][a-z\d+.-]*:)/i.test(ref) && !ref.includes('\\'), 'Non-relative asset: ' + value);
  const file = path.normalize(path.join(path.dirname(from), ref));
  assert(file !== '..' && !file.startsWith('..' + path.sep), 'Reference escapes app: ' + value);
  assert((await stat(path.join(root, file))).isFile(), 'Missing file: ' + file);
  references.add(file);
}

const app = JSON.parse(await read('appinfo.json'));
assert.match(app.id, /^(?!(?:com\.(?:palm|palmdts|webos|lge))(?:\.|$))[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/);
assert.match(app.version, /^(?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*)){2}$/);
assert.equal(app.type, 'web');
assert.equal(app.main, 'index.html');
assert.equal(app.resolution, process.argv.includes('--hd') ? '1280x720' : '1920x1080');
assert.equal(app.disableBackHistoryAPI, true);
assert(app.title && app.vendor);
for (const [name, size] of [[app.icon, 80], [app.largeIcon, 130]]) {
  await localRef(name);
  const png = await readFile(path.join(root, name));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.toString('ascii', 12, 16), 'IHDR');
  assert.equal(png.readUInt32BE(16), size);
  assert.equal(png.readUInt32BE(20), size);
}

const html = await read(app.main);
const critical = html.match(/<style id="romana-critical">([\s\S]*?)<\/style>/);
assert(critical && critical.index < html.indexOf('<body'), 'Missing critical style before body');
const criticalCss = postcss.parse(critical[1]);
assert(criticalCss.nodes.some(rule=>rule.selector==='html,body' && rule.nodes.some(decl=>decl.prop==='background' && decl.value==='#090b10')));
assert(criticalCss.nodes.some(rule=>rule.selector==='html:not([data-romana-ready]) body' && rule.nodes.some(decl=>decl.prop==='opacity' && decl.value==='0')));
assert(criticalCss.nodes.some(rule=>rule.selector==='html:not([data-romana-ready]) #intro' && ['justify-content','align-items'].every(prop=>rule.nodes.some(decl=>decl.prop===prop && decl.value==='center'))));
assert(!/<base\b|\b(?:modulepreload|nomodule)\b|type\s*=\s*["']?module\b|http-equiv\s*=\s*["']?refresh\b/i.test(html), 'Incompatible packaged HTML');
assert(!/\bsrcset\s*=/i.test(html), 'Add srcset validation before using it');
for (const [, quoted, single, bare] of html.matchAll(/\b(?:src|href|poster)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
  await localRef(quoted ?? single ?? bare);
}
assert.deepEqual([...html.matchAll(/<script\b[^>]*>/gi)].map(m => m[0]), ['<script src="./assets/bootstrap.js">']);
assert(html.includes('id="runtime-style"'));
assert.deepEqual((await readdir(root)).sort(), ['appinfo.json','assets','icon.png','index.html','largeIcon.png']);

async function scan(dir) {
  for (const entry of await readdir(path.join(root, dir), {withFileTypes:true})) {
    const file = path.join(dir, entry.name);
    assert(!entry.isSymbolicLink(), 'Unexpected symlink: ' + file);
    if (entry.isDirectory()) { await scan(file); continue; }
    if (file.endsWith('.js')) {
      const source = await read(file);
      if (['compatible.js','modern.js'].includes(entry.name)) {
        assert(source.includes('https://www.sics2002.com/') && source.includes('contact-website'), 'Missing official contact link: ' + file);
        assert(source.includes('data-romana-ready') && source.includes('settings-version'), 'Missing release UI markers: ' + file);
      }
      parse(source, {ecmaVersion: entry.name === 'modern.js' ? 2021 : 5, sourceType:'script'});
      assert(!/\b(?:releaseSelfTest|localeBrandSelfTest|newsSelfTest)\b/.test(source), 'Diagnostics in release: ' + file);
    } else if (file.endsWith('.css')) {
      const css = await read(file);
      const ast = postcss.parse(css, {from:file});
      ast.walkAtRules('import', () => { throw Error('Unbundled CSS import: ' + file); });
      for (const [, value] of css.matchAll(/url\(\s*["']?([^)"']+)["']?\s*\)/gi)) await localRef(value.trim(), file);
    }
  }
}
await scan('assets');

const compatibleCss = await read('assets/compatible.css');
assert.match(compatibleCss, /\.poster-grid\s*\{[^}]*display\s*:\s*flex/);
assert.match(compatibleCss, /\.poster-art\s*\{[^}]*height\s*:/);
assert.match(compatibleCss, /@media\s*\(max-width:\s*1366px\)/);
const bootstrap = await read('assets/bootstrap.js');
const generations = [38,53,68,79,87,94,108,120,132];
for (const engine of generations) {
  for (const width of [1280,1920]) {
    const style = {};
    const attrs = {};
    const scripts = [];
    const events = {};
    const document = {
      createElement: () => ({}), documentElement:{setAttribute:(key,value) => {attrs[key]=value;}},
      getElementById: () => style, body:{appendChild:node => scripts.push(node.src)}, addEventListener:(type,listener) => {events[type]=listener;},
    };
    const window = {innerWidth:width,innerHeight:width*9/16,CSS:{supports:property=>property==='display'||engine>=88}};
    vm.runInNewContext(bootstrap,{window,document,navigator:{userAgent:'Web0S Chrome/'+engine+'.0 WebAppManager'},setTimeout:()=>{}});
    events.cursorStateChange({detail:{visibility:true}});
    assert.equal(attrs['data-remote-cursor'],'visible');
    events.cursorVisibilityChange({detail:{visibility:false}});
    assert.equal(attrs['data-remote-cursor'],'hidden');
    style.onload();
    const mode = engine >= 88 ? 'modern' : 'compatible';
    assert.equal(attrs['data-device-profile'],mode);
    assert.deepEqual(scripts,['./assets/'+mode+'.js']);
    assert.equal(style.href, './assets/'+(mode==='modern'?'styles':'compatible')+'.css');
    await localRef(scripts[0]);
    await localRef(style.href);
  }
}
console.log('PASS: ' + app.title + ' ' + app.version + ', metadata, PNG dimensions, ' + references.size +
 ' asset references, contact and critical splash, classic scripts, ES5 bootstrap/compat, CSS parsing, 18 simulated bootstrap profiles (9 engines x 2 viewports).');
