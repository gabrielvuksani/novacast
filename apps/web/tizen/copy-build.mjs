import { cpSync, existsSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const sourceDir = resolve(root, 'dist');
const targetDir = resolve(root, 'tizen', 'dist');
const configPath = resolve(root, 'tizen', 'config.xml');

if (!existsSync(sourceDir)) {
  throw new Error('Web dist folder was not found. Run the web build before packaging for Tizen.');
}

rmSync(targetDir, { force: true, recursive: true });
mkdirSync(targetDir, { recursive: true });
cpSync(sourceDir, targetDir, { recursive: true });
copyFileSync(configPath, resolve(targetDir, 'config.xml'));

console.log(`Copied web build into ${targetDir} with Tizen config.xml`);
