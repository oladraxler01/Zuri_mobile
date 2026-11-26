#!/usr/bin/env node
/**
 * Publish an over-the-air update to the installed APKs on one channel.
 *
 *   npm run update:preview -- "Timetable import from photos"
 *   npm run update:production -- "Fix sign-in"
 *
 * Why not plain `eas update`: it builds the JavaScript on this computer, so the
 * EXPO_PUBLIC_* values come from the local .env (APP_ENV=development, no
 * diagnostics…) instead of the build profile the APKs were made with. This
 * script copies the env of the eas.json build profile that uses the channel,
 * so an update behaves exactly like the build it lands on. (Values already set
 * in the environment win over .env when Expo loads it.)
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [channel, ...rest] = process.argv.slice(2);
const message = rest.join(' ').trim();

if (!channel || !message) {
  console.error('Usage: npm run update:<channel> -- "What changed"');
  process.exit(1);
}

const eas = JSON.parse(readFileSync(join(root, 'eas.json'), 'utf8'));
const profile = Object.entries(eas.build ?? {}).find(([, p]) => p.channel === channel);
if (!profile) {
  console.error(`No build profile in eas.json uses the channel "${channel}".`);
  process.exit(1);
}
const [profileName, { env = {} }] = profile;

const app = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;
console.log(`Publishing to "${channel}" with the env of the "${profileName}" build profile.`);
console.log(`Only APKs built as version ${app.version} receive it (runtimeVersion policy: appVersion).`);
for (const [k, v] of Object.entries(env)) console.log(`  ${k}=${v}`);

// Windows needs a shell to run npx; elsewhere (CI) pass the message untouched so `quotes` and $ stay as typed.
const windows = process.platform === 'win32';
const result = spawnSync(
  'npx',
  ['--yes', 'eas-cli@latest', 'update', '--channel', channel, '--message', windows ? JSON.stringify(message) : message, '--non-interactive'],
  { cwd: root, stdio: 'inherit', shell: windows, env: { ...process.env, ...env, NODE_ENV: 'production' } }
);
process.exit(result.status ?? 1);
