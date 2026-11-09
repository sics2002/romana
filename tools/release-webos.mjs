import { cp, mkdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { homedir } from 'node:os';
import { buildApplication, buildRoot, projectRoot } from './build.mjs';

const hd = process.argv.includes('--hd');
const releaseRoot = path.join(projectRoot, 'release');
const release = hd ? path.join(releaseRoot, 'hd') : releaseRoot;
const raw = path.join(release, 'romana-webos-raw');
const metadata = await buildApplication({production:true});
await mkdir(release, {recursive:true});
if (await realpath(release) !== path.join(await realpath(projectRoot), 'release', ...(hd ? ['hd'] : []))) {
  throw Error('Release directory must stay inside the project');
}
const rawPath = await realpath(raw).catch(error => {
  if (error.code !== 'ENOENT') throw error;
  return null;
});
if (rawPath && rawPath !== path.join(await realpath(release),'romana-webos-raw')) {
  throw Error('Raw output resolves outside its expected directory');
}
await rm(raw, {recursive:true,force:true});
await mkdir(raw);
await cp(path.join(buildRoot,'assets'),path.join(raw,'assets'),{recursive:true});
for (const name of ['appinfo.json','index.html','icon.png','largeIcon.png']) {
  await cp(path.join(buildRoot,name),path.join(raw,name));
}
await cp(path.join(buildRoot,'intro-logo.jpg'),path.join(raw,'assets','intro-logo.jpg'));

if (hd) {
  metadata.resolution = '1280x720';
  await writeFile(path.join(raw,'appinfo.json'),JSON.stringify(metadata,null,2)+'\n','utf8');
}

function run(entry, args, env = process.env) {
  const result = spawnSync(process.execPath,[entry,...args],{cwd:projectRoot,env,stdio:'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error('Command failed: '+entry);
}
run('verify-compat.js',[raw,...(hd ? ['--hd'] : [])]);

if (process.argv.includes('--package')) {
  const cliRoot = path.join(projectRoot,'node_modules','@webos-tools','cli');
  const cli = JSON.parse(await readFile(path.join(cliRoot,'package.json'),'utf8'));
  const cliDataRoot = path.join(process.env.LOCALAPPDATA || homedir(), 'CinemanaTV', 'webos-cli');
  run(path.join(cliRoot,cli.bin['ares-package']),[raw,path.join(projectRoot,'news-service'),'-o',release,'--no-minify'],
    {...process.env,APPDATA:cliDataRoot});
  const output = path.join(release,metadata.id+'_'+metadata.version+'_all.ipk');
  if (!(await stat(output)).isFile() || (await readFile(output)).subarray(0,8).toString('ascii') !== '!<arch>\n') {
    throw Error('Invalid IPK archive: '+output);
  }
  console.log('Verified IPK archive: '+output);
}
