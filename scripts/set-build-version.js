#!/usr/bin/env node
/**
 * Stamps a unique, ever-increasing version into app.json and package.json
 * for every CI build, so each generated APK carries a different version
 * number automatically — no manual editing required.
 *
 * How it works:
 *  - BUILD_NUMBER comes from the CI environment (GitHub Actions'
 *    `github.run_number`, which always increases by 1 on every workflow
 *    run and is guaranteed unique/monotonic — Android requires
 *    `versionCode` to strictly increase between releases, so this is
 *    exactly what we want, with zero extra state to maintain).
 *  - The human-readable version becomes "<major>.<minor>.<BUILD_NUMBER>"
 *    (e.g. 1.0.42), built from the major.minor already in app.json.
 *  - app.json's expo.android.versionCode is set to BUILD_NUMBER directly
 *    (must be a plain increasing integer).
 *
 * Usage: BUILD_NUMBER=42 node scripts/set-build-version.js
 * (Falls back to a timestamp-based number if BUILD_NUMBER isn't set, so
 * this also works fine for local/manual builds.)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP_JSON_PATH = path.join(ROOT, 'app.json');
const PKG_JSON_PATH = path.join(ROOT, 'package.json');

function getBuildNumber() {
  const fromEnv = process.env.BUILD_NUMBER || process.env.GITHUB_RUN_NUMBER;
  if (fromEnv && !Number.isNaN(Number(fromEnv))) return Number(fromEnv);
  // Local/manual fallback: minutes since 2026-01-01, always increasing.
  const minutesSinceEpoch = Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 60000);
  return minutesSinceEpoch;
}

function main() {
  const buildNumber = getBuildNumber();

  const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
  const currentVersion = appJson.expo.version || '1.0.0';
  const [major = '1', minor = '0'] = currentVersion.split('.');
  const newVersion = `${major}.${minor}.${buildNumber}`;

  appJson.expo.version = newVersion;
  appJson.expo.android = appJson.expo.android || {};
  appJson.expo.android.versionCode = buildNumber;
  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2) + '\n');

  const pkgJson = JSON.parse(fs.readFileSync(PKG_JSON_PATH, 'utf8'));
  pkgJson.version = newVersion;
  fs.writeFileSync(PKG_JSON_PATH, JSON.stringify(pkgJson, null, 2) + '\n');

  console.log(`Stamped version ${newVersion} (versionCode ${buildNumber})`);

  // Expose values to later CI steps via $GITHUB_OUTPUT, if present.
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput) {
    fs.appendFileSync(githubOutput, `version=${newVersion}\n`);
    fs.appendFileSync(githubOutput, `build_number=${buildNumber}\n`);
  }
}

main();
