import { Task, TaskRunner } from './task';
import { pluginBuildRunner } from './plugin.build';
<<<<<<< HEAD
=======
import { restoreCwd } from '../utils/cwd';
>>>>>>> test
import { getPluginJson } from '../../config/utils/pluginValidation';
import { getPluginId } from '../../config/utils/getPluginId';
import execa = require('execa');
import path = require('path');
import fs from 'fs-extra';
import { getPackageDetails, getGrafanaVersions, readGitLog } from '../../plugins/utils';
import { buildManifest, signManifest, saveManifest } from '../../plugins/manifest';
import {
  getJobFolder,
  writeJobStats,
  getCiFolder,
  getPluginBuildInfo,
  getPullRequestNumber,
  getCircleDownloadBaseURL,
} from '../../plugins/env';
import { agregateWorkflowInfo, agregateCoverageInfo, agregateTestInfo } from '../../plugins/workflow';
import { PluginPackageDetails, PluginBuildReport } from '../../plugins/types';
import rimrafCallback from 'rimraf';
import { promisify } from 'util';
const rimraf = promisify(rimrafCallback);

export interface PluginCIOptions {
<<<<<<< HEAD
  finish?: boolean;
  upload?: boolean;
  signatureType?: string;
  rootUrls?: string[];
  maxJestWorkers?: string;
=======
  platform?: string;
  installer?: string;
>>>>>>> test
}

/**
 * 1. BUILD
 *
 *  when platform exists it is building backend, otherwise frontend
 *
 *  Each build writes data:
 *   ~/ci/jobs/build_xxx/
 *
 *  Anything that should be put into the final zip file should be put in:
 *   ~/ci/jobs/build_xxx/dist
 *
 * @deprecated -- this task was written with a specific circle-ci build in mind.  That system
 * has been replaced with Drone, and this is no longer the best practice.  Any new work
 * should be defined in the grafana build pipeline tool or drone configs directly.
 */
const buildPluginRunner: TaskRunner<PluginCIOptions> = async ({ finish, maxJestWorkers }) => {
  const start = Date.now();

  if (finish) {
    const workDir = getJobFolder();
    await rimraf(workDir);
    fs.mkdirSync(workDir);

    // Move local folders to the scoped job folder
    for (const name of ['dist', 'coverage']) {
      const dir = path.resolve(process.cwd(), name);
      if (fs.existsSync(dir)) {
        fs.moveSync(dir, path.resolve(workDir, name));
      }
    }
    writeJobStats(start, workDir);
  } else {
    // Do regular build process with coverage
    await pluginBuildRunner({ coverage: true, maxJestWorkers });
  }
};

<<<<<<< HEAD
export const ciBuildPluginTask = new Task<PluginCIOptions>('Build Plugin', buildPluginRunner);

/**
 * 2. Package
 *
 *  Take everything from `~/ci/job/{any}/dist` and
 *  1. merge it into: `~/ci/dist`
 *  2. zip it into packages in `~/ci/packages`
 *  3. prepare grafana environment in: `~/ci/grafana-test-env`
 *
 *
 * @deprecated -- this task was written with a specific circle-ci build in mind.  That system
 * has been replaced with Drone, and this is no longer the best practice.  Any new work
 * should be defined in the grafana build pipeline tool or drone configs directly.
 */
const packagePluginRunner: TaskRunner<PluginCIOptions> = async ({ signatureType, rootUrls }) => {
  const start = Date.now();
  const ciDir = getCiFolder();
  const packagesDir = path.resolve(ciDir, 'packages');
  const distDir = path.resolve(ciDir, 'dist');
  const docsDir = path.resolve(ciDir, 'docs');
  const jobsDir = path.resolve(ciDir, 'jobs');

  fs.exists(jobsDir, (jobsDirExists) => {
    if (!jobsDirExists) {
      throw new Error('You must run plugin:ci-build prior to running plugin:ci-package');
    }
  });

  const grafanaEnvDir = path.resolve(ciDir, 'grafana-test-env');
  await execa('rimraf', [packagesDir, distDir, grafanaEnvDir]);
  fs.mkdirSync(packagesDir);
  fs.mkdirSync(distDir);

  // Updating the dist dir to have a pluginId named directory in it
  // The zip needs to contain the plugin code wrapped in directory with a pluginId name
  const distContentDir = path.resolve(distDir, getPluginId());
  fs.mkdirSync(grafanaEnvDir);

  console.log('Build Dist Folder');

  // 1. Check for a local 'dist' folder
  const d = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(d)) {
    await execa('cp', ['-rn', d + '/.', distContentDir]);
  }

  // 2. Look for any 'dist' folders under ci/job/XXX/dist
  const dirs = fs.readdirSync(path.resolve(ciDir, 'jobs'));
  for (const j of dirs) {
    const contents = path.resolve(ciDir, 'jobs', j, 'dist');
    if (fs.existsSync(contents)) {
      try {
        await execa('cp', ['-rn', contents + '/.', distContentDir]);
      } catch (er) {
        throw new Error('Duplicate files found in dist folders');
      }
    }
  }

  console.log('Save the source info in plugin.json');
  const pluginJsonFile = path.resolve(distContentDir, 'plugin.json');
  const pluginInfo = getPluginJson(pluginJsonFile);
  pluginInfo.info.build = await getPluginBuildInfo();
  fs.writeFileSync(pluginJsonFile, JSON.stringify(pluginInfo, null, 2), { encoding: 'utf-8' });

  // Write a MANIFEST.txt file in the dist folder
  try {
    const manifest = await buildManifest(distContentDir);
    if (signatureType) {
      manifest.signatureType = signatureType;
    }
    if (rootUrls) {
      manifest.rootUrls = rootUrls;
    }
    const signedManifest = await signManifest(manifest);
    await saveManifest(distContentDir, signedManifest);
  } catch (err) {
    console.warn(`Error signing manifest: ${distContentDir}`, err);
  }

  console.log('Building ZIP');
  let zipName = pluginInfo.id + '-' + pluginInfo.info.version + '.zip';
  let zipFile = path.resolve(packagesDir, zipName);
  await execa('zip', ['-r', zipFile, '.'], { cwd: distDir });
=======
const getWorkFolder = () => {
  let dir = `${process.cwd()}/work`;
  if (process.env.CIRCLE_JOB) {
    dir = path.resolve(dir, process.env.CIRCLE_JOB);
  }
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const writeWorkStats = (startTime: number, workDir: string) => {
  const elapsed = Date.now() - startTime;
  const stats = {
    job: `${process.env.CIRCLE_JOB}`,
    startTime,
    buildTime: elapsed,
    endTime: Date.now(),
  };
  const f = path.resolve(workDir, 'stats.json');
  fs.writeFile(f, JSON.stringify(stats, null, 2), err => {
    if (err) {
      throw new Error('Unable to stats: ' + f);
    }
  });
};

/**
 * 1. BUILD
 *
 *  when platform exists it is building backend, otherwise frontend
 *
 *  Each build writes data:
 *   ~/work/build_xxx/
 *
 *  Anything that should be put into the final zip file should be put in:
 *   ~/work/build_xxx/dist
 */
const buildPluginRunner: TaskRunner<PluginCIOptions> = async ({ platform }) => {
  const start = Date.now();
  const workDir = getWorkFolder();
  await execa('rimraf', [workDir]);
  fs.mkdirSync(workDir);

  if (platform) {
    console.log('TODO, backend support?');
    const file = path.resolve(workDir, 'README.txt');
    fs.writeFile(workDir + '/README.txt', 'TODO... build it!', err => {
      if (err) {
        throw new Error('Unable to write: ' + file);
      }
    });
  } else {
    // Do regular build process with coverage
    await pluginBuildRunner({ coverage: true });
  }

  // Move dist to the scoped work folder
  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    fs.renameSync(distDir, path.resolve(workDir, 'dist'));
  }
  writeWorkStats(start, workDir);
};

export const ciBuildPluginTask = new Task<PluginCIOptions>('Build Plugin', buildPluginRunner);

/**
 * 2. BUNDLE
 *
 *  Take everything from `~/work/build_XXX/dist` and zip it into
 *  artifacts
 *
 */
const bundlePluginRunner: TaskRunner<PluginCIOptions> = async () => {
  const start = Date.now();
  const workDir = getWorkFolder();

  // Copy all `dist` folders to the root dist folder
  const distDir = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
  }
  fs.mkdirSync(distDir, { recursive: true });
  const dirs = fs.readdirSync(workDir);
  for (const dir of dirs) {
    if (dir.startsWith('build_')) {
      const contents = path.resolve(dir, 'dist');
      if (fs.existsSync(contents)) {
        await execa('cp', ['-rp', contents, distDir]);
      }
    }
  }

  // Create an artifact
  const artifactsDir = path.resolve(process.cwd(), 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const pluginInfo = getPluginJson(`${distDir}/plugin.json`);
  const zipName = pluginInfo.id + '-' + pluginInfo.info.version + '.zip';
  const zipFile = path.resolve(artifactsDir, zipName);
  process.chdir(distDir);
  await execa('zip', ['-r', zipFile, '.']);
  restoreCwd();
>>>>>>> test

  const zipStats = fs.statSync(zipFile);
  if (zipStats.size < 100) {
    throw new Error('Invalid zip file: ' + zipFile);
  }
<<<<<<< HEAD

  // Make a copy so it is easy for report to read
  await execa('cp', [pluginJsonFile, distDir]);

  const info: PluginPackageDetails = {
    plugin: await getPackageDetails(zipFile, distDir),
  };

  console.log('Setup Grafana Environment');
  let p = path.resolve(grafanaEnvDir, 'plugins', pluginInfo.id);
  fs.mkdirSync(p, { recursive: true });
  await execa('unzip', [zipFile, '-d', p]);

  // If docs exist, zip them into packages
  if (fs.existsSync(docsDir)) {
    console.log('Creating documentation zip');
    zipName = pluginInfo.id + '-' + pluginInfo.info.version + '-docs.zip';
    zipFile = path.resolve(packagesDir, zipName);
    await execa('zip', ['-r', zipFile, '.'], { cwd: docsDir });

    info.docs = await getPackageDetails(zipFile, docsDir);
  }

  p = path.resolve(packagesDir, 'info.json');
  fs.writeFileSync(p, JSON.stringify(info, null, 2), { encoding: 'utf-8' });

  // Write the custom settings
  p = path.resolve(grafanaEnvDir, 'custom.ini');
  const customIniBody =
    `# Autogenerated by @grafana/toolkit \n` +
    `[paths] \n` +
    `plugins = ${path.resolve(grafanaEnvDir, 'plugins')}\n` +
    `\n`; // empty line
  fs.writeFileSync(p, customIniBody, { encoding: 'utf-8' });

  writeJobStats(start, getJobFolder());
};

export const ciPackagePluginTask = new Task<PluginCIOptions>('Bundle Plugin', packagePluginRunner);

/**
 * 4. Report
 *
 *  Create a report from all the previous steps
 *
 * @deprecated -- this task was written with a specific circle-ci build in mind.  That system
 * has been replaced with Drone, and this is no longer the best practice.  Any new work
 * should be defined in the grafana build pipeline tool or drone configs directly.
 */
const pluginReportRunner: TaskRunner<PluginCIOptions> = async ({ upload }) => {
  const ciDir = path.resolve(process.cwd(), 'ci');
  const packageDir = path.resolve(ciDir, 'packages');
  const packageInfo = require(path.resolve(packageDir, 'info.json')) as PluginPackageDetails;

  const pluginJsonFile = path.resolve(ciDir, 'dist', 'plugin.json');
  console.log('Load info from: ' + pluginJsonFile);

  const pluginMeta = getPluginJson(pluginJsonFile);
  const report: PluginBuildReport = {
    plugin: pluginMeta,
    packages: packageInfo,
    workflow: agregateWorkflowInfo(),
    coverage: agregateCoverageInfo(),
    tests: agregateTestInfo(),
    artifactsBaseURL: await getCircleDownloadBaseURL(),
    grafanaVersion: getGrafanaVersions(),
    git: await readGitLog(),
  };
  const pr = getPullRequestNumber();
  if (pr) {
    report.pullRequest = pr;
  }

  // Save the report to disk
  const file = path.resolve(ciDir, 'report.json');
  fs.writeFileSync(file, JSON.stringify(report, null, 2), { encoding: 'utf-8' });

  const GRAFANA_API_KEY = process.env.GRAFANA_API_KEY;
  if (!GRAFANA_API_KEY) {
    console.log('Enter a GRAFANA_API_KEY to upload the plugin report');
    return;
  }
  const url = `https://grafana.com/api/plugins/${report.plugin.id}/ci`;

  console.log('Sending report to:', url);
  const axios = require('axios');
  const info = await axios.post(url, report, {
    headers: { Authorization: 'Bearer ' + GRAFANA_API_KEY },
  });
  if (info.status === 200) {
    console.log('OK: ', info.data);
  } else {
    console.warn('Error: ', info);
=======
  await execa('sha1sum', [zipFile, '>', zipFile + '.sha1']);
  const info = {
    name: zipName,
    size: zipStats.size,
  };
  const f = path.resolve(artifactsDir, 'info.json');
  fs.writeFile(f, JSON.stringify(info, null, 2), err => {
    if (err) {
      throw new Error('Error writing artifact info: ' + f);
    }
  });

  writeWorkStats(start, workDir);
};

export const ciBundlePluginTask = new Task<PluginCIOptions>('Bundle Plugin', bundlePluginRunner);

/**
 * 3. Setup (install grafana and setup provisioning)
 *
 *  deploy the zip to a running grafana instance
 *
 */
const setupPluginRunner: TaskRunner<PluginCIOptions> = async ({ installer }) => {
  const start = Date.now();

  if (!installer) {
    throw new Error('Missing installer path');
  }

  // Download the grafana installer
  const workDir = getWorkFolder();
  const installFile = path.resolve(workDir, installer);
  if (!fs.existsSync(installFile)) {
    console.log('download', installer);
    const exe = await execa('wget', ['-O', installFile, 'https://dl.grafana.com/oss/release/' + installer]);
    console.log(exe.stdout);
  }

  // Find the plugin zip file
  const artifactsDir = path.resolve(process.cwd(), 'artifacts');
  const artifactsInfo = require(path.resolve(artifactsDir, 'info.json'));
  const pluginZip = path.resolve(workDir, 'artifacts', artifactsInfo.name);
  if (!fs.existsSync(pluginZip)) {
    throw new Error('Missing zip file:' + pluginZip);
  }

  // Create a grafana runtime folder
  const grafanaPluginsDir = path.resolve(require('os').homedir(), 'grafana', 'plugins');
  await execa('rimraf', [grafanaPluginsDir]);
  fs.mkdirSync(grafanaPluginsDir, { recursive: true });

  // unzip package.zip -d /opt
  let exe = await execa('unzip', [pluginZip, '-d', grafanaPluginsDir]);
  console.log(exe.stdout);

  // Write the custom settings
  const customIniPath = '/usr/share/grafana/conf/custom.ini';
  const customIniBody = `[paths] \n` + `plugins = ${grafanaPluginsDir}\n` + '';
  fs.writeFile(customIniPath, customIniBody, err => {
    if (err) {
      throw new Error('Unable to write: ' + customIniPath);
    }
  });

  console.log('Install Grafana');
  exe = await execa('sudo', ['dpkg', 'i', installFile]);
  console.log(exe.stdout);

  exe = await execa('sudo', ['grafana-server', 'start']);
  console.log(exe.stdout);
  exe = await execa('grafana-cli', ['--version']);

  writeWorkStats(start, workDir + '_setup');
};

export const ciSetupPluginTask = new Task<PluginCIOptions>('Setup Grafana', setupPluginRunner);

/**
 * 4. Test (end-to-end)
 *
 *  deploy the zip to a running grafana instance
 *
 */
const testPluginRunner: TaskRunner<PluginCIOptions> = async ({ platform }) => {
  const start = Date.now();
  const workDir = getWorkFolder();

  const args = {
    withCredentials: true,
    baseURL: process.env.GRAFANA_URL || 'http://localhost:3000/',
    responseType: 'json',
    auth: {
      username: 'admin',
      password: 'admin',
    },
  };

  const axios = require('axios');
  const frontendSettings = await axios.get('api/frontend/settings', args);

  console.log('Grafana Version: ' + JSON.stringify(frontendSettings.data.buildInfo, null, 2));

  const pluginInfo = getPluginJson(`${process.cwd()}/src/plugin.json`);
  const pluginSettings = await axios.get(`api/plugins/${pluginInfo.id}/settings`, args);

  console.log('Plugin Info: ' + JSON.stringify(pluginSettings.data, null, 2));

  console.log('TODO puppeteer');

  const elapsed = Date.now() - start;
  const stats = {
    job: `${process.env.CIRCLE_JOB}`,
    sha1: `${process.env.CIRCLE_SHA1}`,
    startTime: start,
    buildTime: elapsed,
    endTime: Date.now(),
  };

  console.log('TODO Puppeteer Tests', stats);
  writeWorkStats(start, workDir);
};

export const ciTestPluginTask = new Task<PluginCIOptions>('Test Plugin (e2e)', testPluginRunner);

/**
 * 4. Deploy
 *
 *  deploy the zip to a running grafana instance
 *
 */
const deployPluginRunner: TaskRunner<PluginCIOptions> = async () => {
  const start = Date.now();

  // TASK Time
  if (process.env.CIRCLE_INTERNAL_TASK_DATA) {
    const timingInfo = fs.readdirSync(`${process.env.CIRCLE_INTERNAL_TASK_DATA}`);
    if (timingInfo) {
      timingInfo.forEach(file => {
        console.log('TIMING INFO: ', file);
      });
    }
>>>>>>> test
  }

  const elapsed = Date.now() - start;
  const stats = {
    job: `${process.env.CIRCLE_JOB}`,
    sha1: `${process.env.CIRCLE_SHA1}`,
    startTime: start,
    buildTime: elapsed,
    endTime: Date.now(),
  };
  console.log('TODO DEPLOY??', stats);
  console.log(' if PR => write a comment to github with difference ');
  console.log(' if master | vXYZ ==> upload artifacts to some repo ');
};

<<<<<<< HEAD
export const ciPluginReportTask = new Task<PluginCIOptions>('Generate Plugin Report', pluginReportRunner);
=======
export const ciDeployPluginTask = new Task<PluginCIOptions>('Deploy plugin', deployPluginRunner);
>>>>>>> test
