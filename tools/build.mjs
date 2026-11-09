import { build } from 'esbuild';
import { access, cp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const buildRoot = path.join(projectRoot, 'build');
export const proofBuildRoot = path.join(buildRoot, 'proof');

export function backupProject(label) {
  // CI uses a disposable checkout and does not need a workstation snapshot.
  if (process.env.GITHUB_ACTIONS === 'true') return;
  if (process.platform !== 'win32') {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshot = path.join(projectRoot, '..', '.backups', stamp + '-' + label);
    mkdirSync(snapshot, {recursive:true});
    for (const name of readdirSync(projectRoot)) {
      if (name !== 'node_modules' && name !== '.git') {
        cpSync(path.join(projectRoot,name), path.join(snapshot,name), {recursive:true});
      }
    }
    console.log(snapshot);
    return;
  }
  const backup = spawnSync('powershell.exe', [
    '-NoProfile', '-File', path.join(projectRoot, 'tools', 'backup.ps1'), '-Label', label
  ], { cwd: projectRoot, stdio: 'inherit' });
  if (backup.error) throw backup.error;
  if (backup.status !== 0) throw new Error('Backup failed. No build output has been changed.');
}

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

export async function buildApplication({production = false} = {}) {
  const required = ['index.html', 'src/main.js', 'src/styles.css', 'static/appinfo.json', 'static/icon.png'];
  for (const file of required) {
    if (!await exists(path.join(projectRoot, file))) {
      throw new Error(`Missing application source: ${file}. The full application is not ready to package.`);
    }
  }
  const metadata = JSON.parse(await readFile(path.join(projectRoot, 'static/appinfo.json'), 'utf8'));
  for (const field of ['id', 'title', 'type', 'main', 'icon', 'version']) {
    if (!metadata[field]) throw new Error(`Missing appinfo.json field: ${field}`);
  }
  if (metadata.main !== 'index.html' || metadata.type !== 'web') {
    throw new Error('This build requires main=index.html and type=web.');
  }
  const {validateUtf8}=await import('./encoding.mjs');
  await validateUtf8(projectRoot);
  backupProject('before-build');
  // Remove only this verified output directory, after preserving the project snapshot.
  if (path.dirname(buildRoot) !== projectRoot || path.basename(buildRoot) !== 'build') {
    throw new Error('Unexpected build output directory.');
  }
  if (await exists(buildRoot) && await realpath(buildRoot) !== path.join(await realpath(projectRoot),'build')) {
    throw new Error('Build output resolves outside its expected directory.');
  }
  await rm(buildRoot, { recursive: true, force: true });
  await mkdir(buildRoot, { recursive: true });
  const assetDir = production ? 'assets/' : '';
  await mkdir(path.join(buildRoot, assetDir), { recursive: true });
  const {transformAsync}=await import('@babel/core');
  const {default:postcss}=await import('postcss');
  const {default:customProperties}=await import('postcss-custom-properties');
  const {default:autoprefixer}=await import('autoprefixer');
  async function javascript(entry,name,target,compat=false){
    const result=await build({absWorkingDir:projectRoot,entryPoints:[entry],bundle:true,define:{__ROMANA_ASSET_DIR__:JSON.stringify('./'+assetDir),__ROMANA_DIAGNOSTICS__:String(!production),__ROMANA_VERSION__:JSON.stringify(metadata.version)},format:'iife',platform:'browser',target:[target],charset:'utf8',legalComments:'eof',minify:true,write:false});
    let code=result.outputFiles[0].text;
    if(compat)code=(await transformAsync(code,{presets:[['@babel/preset-env',{targets:{ie:'11'},modules:false}]],sourceType:'script',comments:false,compact:true})).code;
    if(compat){const {parse}=await import('acorn');parse(code,{ecmaVersion:5});}
    await writeFile(path.join(buildRoot,assetDir,name),code,'utf8');
  }
  const {parse}=await import('acorn');
  for(const file of ['news-service/service.cjs','news-service/feeds.cjs'])parse(await readFile(path.join(projectRoot,file),'utf8'),{ecmaVersion:5,allowReturnOutsideFunction:true});
  await javascript('src/bootstrap.js','bootstrap.js','es2015',true);
  await javascript('src/main.js','modern.js','chrome88');
  await javascript('src/legacy-entry.js','compatible.js','chrome108',true);
  await build({absWorkingDir:projectRoot,entryPoints:['src/styles.css'],outfile:path.join(buildRoot,assetDir,'styles.css'),bundle:true,target:['chrome88'],charset:'utf8',minify:true,assetNames:'assets/[name]-[hash]',loader:{'.woff2':'file','.woff':'file','.ttf':'file','.png':'file','.jpg':'file','.webp':'file','.svg':'file'}});
  const legacyCss=await build({absWorkingDir:projectRoot,entryPoints:['src/styles.css'],bundle:true,target:['safari7'],charset:'utf8',minify:true,write:false});
  const legacyPositions={postcssPlugin:'legacy-inset',Declaration(decl){if(decl.prop==='inset'){const v=decl.value.split(/\s+/),values=[v[0],v[1]||v[0],v[2]||v[0],v[3]||v[1]||v[0]];['top','right','bottom','left'].forEach((prop,i)=>decl.cloneBefore({prop,value:values[i]}));}}};
  const compatibleCss=await postcss([legacyPositions,customProperties({preserve:true}),autoprefixer({overrideBrowserslist:['Chrome 38','Safari 7']})]).process(legacyCss.outputFiles[0].text+'\n'+await readFile(path.join(projectRoot,'src/legacy.css'),'utf8'),{from:undefined});
  await writeFile(path.join(buildRoot,assetDir,'compatible.css'),compatibleCss.css,'utf8');
  await cp(path.join(projectRoot, 'static'), buildRoot, { recursive: true });

  if (await exists(path.join(projectRoot, 'assets'))) {
    await cp(path.join(projectRoot, 'assets'), path.join(buildRoot, 'assets'), { recursive: true });
  }
  let html = await readFile(path.join(projectRoot, 'index.html'), 'utf8');
  html = html
    .replace(/(<script\b[^>]*\bsrc=["'])(?:\.\/|\/)?src\/main\.js(["'])/gi, '$1./bootstrap.js$2')
    .replace(/(<link\b[^>]*\bhref=["'])(?:\.\/|\/)?src\/styles\.css(["'])/gi, '$1./styles.css$2')
    .replace(/\s+type=["']module["']/gi, '');
  html=html.replace(/<link([^>]*href=[\"'](?:\.\/)?styles\.css[\"'][^>]*)>/i,'<link id=\"runtime-style\" rel=\"stylesheet\">');
  if (!/<script\b[^>]*\bsrc=["'](?:\.\/)?bootstrap\.js["']/i.test(html)) {
    throw new Error('index.html must reference the universal bootstrap.');
  }
  if (!html.includes('runtime-style')) {
    throw new Error('index.html must reference src/styles.css or ./styles.css.');
  }
  if (production) html = html.replace('./bootstrap.js','./assets/bootstrap.js').replace('./intro-logo.jpg','./assets/intro-logo.jpg');
  await writeFile(path.join(buildRoot, 'index.html'), html, 'utf8');
  console.log(`Built webOS application: ${buildRoot}`);
  return metadata;
}

export async function buildProofApplication() {
  for (const file of ['proof/index.html', 'proof/proof.js', 'static/appinfo.json', 'static/icon.png']) {
    if (!await exists(path.join(projectRoot, file))) throw new Error(`Missing proof source: ${file}`);
  }
  backupProject('before-proof-build');
  if (path.dirname(proofBuildRoot) !== buildRoot || path.basename(proofBuildRoot) !== 'proof') {
    throw new Error('Unexpected proof output directory.');
  }
  if (await exists(buildRoot) && await realpath(buildRoot) !== path.join(await realpath(projectRoot),'build')) {
    throw new Error('Proof output parent resolves outside its expected directory.');
  }
  if (await exists(proofBuildRoot) && await realpath(proofBuildRoot) !== path.join(await realpath(projectRoot),'build','proof')) {
    throw new Error('Proof output resolves outside its expected directory.');
  }
  await rm(proofBuildRoot, { recursive: true, force: true });
  await mkdir(proofBuildRoot, { recursive: true });
  await build({
    absWorkingDir: projectRoot,
    entryPoints: ['proof/proof.js'],
    outfile: path.join(proofBuildRoot, 'proof.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome108'],
    charset: 'utf8',
    legalComments: 'eof',
    minify: false,
    sourcemap: false,
    logLevel: 'info'
  });
  const html = (await readFile(path.join(projectRoot, 'proof/index.html'), 'utf8'))
    .replace(/\s+type=["']module["']/gi, '');
  await writeFile(path.join(proofBuildRoot, 'index.html'), html, 'utf8');
  await cp(path.join(projectRoot, 'static/icon.png'), path.join(proofBuildRoot, 'icon.png'));
  const metadata = {
    ...JSON.parse(await readFile(path.join(projectRoot, 'static/appinfo.json'), 'utf8')),
    id: 'com.cinemanatv.proof',
    title: 'Cinemana TV Proof',
    appDescription: 'Independent playback verification on LG webOS TV'
  };
  await writeFile(path.join(proofBuildRoot, 'appinfo.json'), JSON.stringify(metadata, null, 2) + '\n', 'utf8');
  console.log(`Built playback proof: ${proofBuildRoot}`);
  return metadata;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const action = process.argv.includes('--proof') ? buildProofApplication : buildApplication;
  action().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
