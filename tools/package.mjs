import { mkdir, readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import { backupProject, buildApplication, buildProofApplication, buildRoot, proofBuildRoot, projectRoot } from './build.mjs';

try {
  const isProof = process.argv.includes('--proof');
  const metadata = await (isProof ? buildProofApplication() : buildApplication());
  backupProject('before-ipk-package');
  const output = path.join(projectRoot, 'dist');
  await mkdir(output, { recursive: true });
  const cliRoot = path.join(projectRoot, 'node_modules', '@webos-tools', 'cli');
  const cli = JSON.parse(await readFile(path.join(cliRoot, 'package.json'), 'utf8'));
  const entry = cli.bin?.['ares-package'];
  if (!entry) throw new Error('The installed official CLI has no ares-package entry point.');
  // Keep CLI state outside the project: LG may store pairing credentials there.
  const cliDataRoot = path.join(process.env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local'), 'CinemanaTV', 'webos-cli');
  // Run the project-local CLI with process-only environment isolation.
  const result = spawnSync(process.execPath, [path.join(cliRoot, entry), isProof ? proofBuildRoot : buildRoot, ...(isProof ? [] : [path.join(projectRoot, 'news-service')]), '-o', output], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, APPDATA: cliDataRoot }
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`webOS packaging failed (${result.status}).`);
  const packagePath = path.join(output, `${metadata.id}_${metadata.version}_all.ipk`);
  const info = await stat(packagePath);
  if (info.size <= 8) throw new Error('CLI did not produce a nonempty IPK.');
  const header = (await readFile(packagePath)).subarray(0, 8).toString('ascii');
  if (header !== '!<arch>\n') throw new Error('The output does not have an IPK/ar archive signature.');
  console.log(`Created IPK: ${packagePath} (${info.size} bytes). Installation and TV playback are not yet verified.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
