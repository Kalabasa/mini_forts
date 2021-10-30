const path = require('path');
const fs = require('fs-extra');
const readline = require('readline');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const glob = require('glob');
const tar = require('tar');
const luamin = require('luamin');

const packageJson = require('./package.json');

const serverTsconfigPath = path.resolve(__dirname, 'tsconfig.tstl.server.json');
const serverTsconfig = require(serverTsconfigPath);

const clientTsconfigPath = path.resolve(__dirname, 'tsconfig.tstl.client.json');
const clientTsconfig = require(clientTsconfigPath);

const gameConfPath = path.resolve(
  __dirname,
  'src',
  'server',
  'static',
  'game.conf'
);
const generatedConfigPath = path.resolve(__dirname, 'src', 'conf.generated.ts');

const MODE_PROD = 'prod';
const MODE_DEV = 'dev';
const mode = process.env.NODE_ENV || MODE_DEV;
if (![MODE_PROD, MODE_DEV].includes(mode)) {
  throw new Error('Invalid mode:' + mode);
}

const ROLE_CLIENT = 'client';
const ROLE_SERVER = 'server';

build(mode).catch(console.error);

async function build(mode) {
  console.log('Reading game.conf...');
  let gameName = '';
  for await (const line of readline.createInterface(
    await fs.createReadStream(gameConfPath)
  )) {
    const [left, right] = line.split('=');
    if (left.trim() === 'name') {
      gameName = right.trim();
      break;
    }
  }

  const distDir = path.resolve(__dirname, 'dist');
  const buildString = await getBuildString(mode);

  // todo: parallelize (need to separate config files)
  try {
    console.log('Building server package...');
    await writeConfigFile({
      gameName,
      version: packageJson.version,
      build: buildString,
      mode,
      role: ROLE_SERVER,
    });
    await compileServerPackage(distDir, gameName);

    console.log('Building client package...');
    await writeConfigFile({
      gameName,
      version: packageJson.version,
      build: buildString,
      mode,
      role: ROLE_CLIENT,
    });
    await compileClientPackage(distDir, gameName);

    if (mode === MODE_PROD) {
      await packageDistributable(distDir, gameName, buildString);
    }
  } finally {
    await writeConfigFile({ gameName });
  }
}

async function writeConfigFile(config) {
  await fs.writeFile(generatedConfigPath, generateConfigFile(config));
}

function generateConfigFile({ gameName, version, build, role, mode }) {
  return `\
export default {
  gameName: '${gameName || ''}',
  version: '${version || ''}',
  build: '${build || ''}',
  role: '${role || ''}',
  isClient: ${role === ROLE_CLIENT},
  isServer: ${role === ROLE_SERVER},
  mode: '${mode || ''}',
  isProd: ${mode === MODE_PROD},
  isDev: ${mode === MODE_DEV},
};\
`;
}

async function compileServerPackage(distDir, gameName) {
  const luaCode = await compile(serverTsconfig, serverTsconfigPath, mode);

  const gameDir = path.resolve(distDir, 'games', gameName);
  const modDir = path.resolve(gameDir, 'mods', gameName);

  await fs.ensureDir(gameDir);
  await fs.ensureDir(modDir);

  await fs.writeFile(path.resolve(modDir, 'server_bundle.lua'), luaCode);

  const staticDir = path.resolve(__dirname, 'src', 'server', 'static');
  await fs.copy(staticDir, gameDir);

  const { tex, snd } = await importTS('resource_id');
  await copyMediaFiles('textures', 'png', tex);
  await copyMediaFiles('sounds', 'ogg', snd);

  async function copyMediaFiles(mediaDirName, fileExt, idFunc) {
    await fs.ensureDir(path.resolve(modDir, mediaDirName));
    const files = glob.sync(`src/**/*.${fileExt}`);
    await Promise.all(
      files.map((file) => {
        if (!path.relative(staticDir, file).startsWith('..')) {
          return Promise.resolve();
        }

        return fs.copy(
          file,
          path.resolve(modDir, mediaDirName, idFunc(path.basename(file)))
        );
      })
    );
  }
}

async function compileClientPackage(distDir, gameName) {
  const luaCode = await compile(clientTsconfig, clientTsconfigPath, mode);

  const modDir = path.resolve(distDir, 'clientmods', gameName);

  await fs.ensureDir(modDir);

  await fs.writeFile(path.resolve(modDir, 'client_bundle.lua'), luaCode);

  const staticDir = path.resolve(__dirname, 'src', 'client', 'static');
  await fs.copy(staticDir, modDir);
}

async function compile(tsconfig, tsconfigPath, mode) {
  await fs.ensureDir(path.dirname(tsconfig.tstl.luaBundle));

  try {
    await exec(`npx tstl -p ${tsconfigPath}`);
  } catch (error) {
    console.error(error.stdout);
    process.exit(error.code);
  }
  const luaCode = (await fs.readFile(tsconfig.tstl.luaBundle)).toString();

  let minetestLuaCode = luaCode
    // minetest security thingy
    .replace('____originalRequire = require', '____originalRequire = dofile');

  if (mode === MODE_PROD) {
    minetestLuaCode = luamin.minify(minetestLuaCode);
  }

  return minetestLuaCode;
}

async function getBuildString(mode) {
  const format = new Intl.DateTimeFormat('en-us', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });

  const parts = format.formatToParts(new Date());
  const year = parts.find((p) => p.type === 'year').value;
  const month = parts.find((p) => p.type === 'month').value;
  const day = parts.find((p) => p.type === 'day').value;

  const rev = (await exec('git rev-parse --short HEAD')).stdout
    .toString()
    .trim();

  return `${year + month + day}.${rev}.${mode}`;
}

let moduleCache = [];
async function importTS(moduleName) {
  if (!moduleCache[moduleName]) {
    const rootDir = path.resolve(__dirname, 'src');
    const srcFile = path.resolve(rootDir, moduleName + '.ts');
    const outDir = path.resolve(__dirname, 'build');
    const outFile = path.resolve(outDir, moduleName + '.js');
    const buildInfoFile = path.resolve(outDir, 'tsbuildinfo');

    console.log(`Compiling ${moduleName}...`);
    await exec(
      `npx tsc --incremental --tsBuildInfoFile '${buildInfoFile}' --outDir '${outDir}' --rootDir '${rootDir}' '${srcFile}'`
    );

    moduleCache[moduleName] = await import(outFile);
  }
  return moduleCache[moduleName];
}

async function packageDistributable(distDir, gameName, buildString) {
  console.log('Packaging distributable...');

  const files = glob
    .sync(distDir + '/**')
    .map((dir) => path.relative(distDir, dir));

  const releaseDir = path.resolve(__dirname, 'release');
  await fs.ensureDir(releaseDir);

  const distributable = path.resolve(
    releaseDir,
    `${gameName}-${buildString}.tar.gz`
  );

  tar.create(
    {
      file: distributable,
      cwd: distDir,
      prefix: gameName,
      portable: true,
      gzip: true,
    },
    files
  );
}
