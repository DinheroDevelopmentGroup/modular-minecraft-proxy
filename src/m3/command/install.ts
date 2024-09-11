import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { cp, rm, writeFile } from 'fs/promises';
import { Listr } from 'listr2';
import { resolve } from 'path';
import type { Writable } from 'stream';
import { setTimeout as sleep } from 'timers/promises';
import { dir } from 'tmp-promise';

import { exists } from '../../util/file.js';
import { getGlobalData } from '../module.js';
import type { Stdio } from '../process.js';
import { run } from '../process.js';
import program, { moduleName, modulesDir } from '../program.js';
import type { GlobalModuleData, LocalModuleData } from '../types.js';

// Calculate Delta
//   Install module (and dependencies) (shallow)
// Ask for confirmation

program
  .command('install')
  .alias('i')
  .description(
    moduleName === undefined ? 'install a module' : 'install a dependency',
  )
  .argument('<url>')
  .addHelpText(
    'after',
    '\nExamples:\n  m3 i[nstall] https://github.com/DinheroDevelopmentGroup/mmp.chat.git\n  m3 i[nstall] github://DinheroDevelopmentGroup/mmp.chat',
  )
  .option('-y, --yes', 'skip confirmation')
  .action(async (url: string, options: { yes: boolean }) => {
    if (url.startsWith('github://')) {
      url = url.replace('github://', 'https://github.com/');
      url += '.git';
    }

    // Add dependency if in module
    if (moduleName !== undefined) {
      const globalPath = resolve(modulesDir, moduleName, 'm3.global.json');
      const global = await getGlobalData(globalPath);

      if (!global.dependencies.includes(url)) global.dependencies.push(url);

      await writeFile(globalPath, JSON.stringify(global, null, 2));
    }

    console.log('Calculating delta...');

    const addedUrls = new Set<string>();

    interface ModuleData {
      manual: boolean;
    }

    const modules = new Map<string, ModuleData>();

    await addModule(url, true);

    if (modules.size === 0) {
      console.log('Nothing to do.');
      return;
    }

    console.log(`Adding ${modules.size} module(s)...`);

    if (!options.yes) {
      if (!(await confirm({ message: 'Continue?' }))) return;
    }

    await new Listr(
      Array.from(modules.entries()).map(([url, data]) => ({
        title: url,
        task: async (_ctx, task) => {
          interface Context {
            path?: string;
            global?: GlobalModuleData;
          }

          await sleep(1000 * Math.random());

          await task
            .newListr<Context>(
              [
                {
                  title: 'Clone repository',
                  task: async (ctx) => {
                    const stdout = task.stdout() as Writable;

                    ctx.path = await getRepo(url, {
                      shallow: true,
                      stdio: { stdout, stderr: stdout },
                    });
                  },
                },
                {
                  title: 'Parse m3 metadata',
                  task: async (ctx) => {
                    const path = ctx.path;
                    if (path === undefined) throw new Error('undefined path');

                    const globalPath = resolve(path, 'm3.global.json');

                    ctx.global = await getGlobalData(globalPath);
                  },
                },
                {
                  title: 'Move directory',
                  task: async (ctx) => {
                    const path = ctx.path;
                    if (path === undefined) throw new Error('undefined path');

                    const global = ctx.global;
                    if (global === undefined)
                      throw new Error('undefined global module data');

                    const localPath = resolve(modulesDir, global.name);

                    await cp(path, localPath, {
                      recursive: true,
                    });

                    ctx.path = localPath;
                  },
                },
                {
                  title: 'Generate local module data',
                  task: async (ctx) => {
                    const path = ctx.path;
                    if (path === undefined) throw new Error('undefined path');

                    const localData: LocalModuleData = {
                      manual: data.manual,
                    };

                    await writeFile(
                      resolve(path, 'm3.local.json'),
                      JSON.stringify(localData, undefined, 2),
                    );
                  },
                },
                {
                  title: 'npm install',
                  task: async (ctx, task) => {
                    const path = ctx.path;

                    await run(
                      'npm',
                      ['install', '--verbose'],
                      { cwd: path },
                      { stdout: task.stdout() as Writable },
                    );
                  },
                },
              ],
              {
                concurrent: false,
              },
            )
            .run({});
        },
      })),
      { concurrent: true, collectErrors: 'minimal' },
    ).run();

    async function addModule(url: string, manual: boolean): Promise<void> {
      if (addedUrls.has(url)) return;
      addedUrls.add(url);

      await withRepo(
        url,
        async (path) => {
          const globalPath = resolve(path, 'm3.global.json');

          let global: GlobalModuleData;

          try {
            global = await getGlobalData(globalPath);
          } catch (error) {
            throw new Error(
              `Failed to parse global module data, ${url} is probably not an m3 module`,
              {
                cause: error,
              },
            );
          }

          const localPath = resolve(modulesDir, global.name);
          if (await exists(localPath)) {
            return;
          }

          modules.set(url, { manual });
          console.log(chalk.green(`[+] ${global.name}`));

          const promises: Promise<void>[] = [];

          for (const dependency of global.dependencies) {
            promises.push(
              (async () => {
                await addModule(dependency, false);
              })(),
            );
          }

          await Promise.all(promises);
        },
        { shallow: true },
      );
    }

    interface GitCloneOptions {
      shallow?: boolean;
      stdio?: Stdio;
      verbose?: boolean;
    }

    async function gitClone(
      url: string,
      path: string,
      options: GitCloneOptions = {},
    ): Promise<void> {
      await run(
        'git',
        [
          'clone',
          url,
          path,
          (options.shallow ?? false) ? '--depth=1' : undefined,
          (options.verbose ?? false) ? '--verbose' : undefined,
        ].filter((arg) => arg !== undefined),
        {},
        {},
      );
    }

    async function getRepo(
      url: string,
      options?: GitCloneOptions,
    ): Promise<string> {
      const { path } = await dir();

      await gitClone(url, path, options);

      return path;
    }

    async function withRepo(
      url: string,
      callback: (path: string) => void | Promise<void>,
      options?: GitCloneOptions,
    ): Promise<void> {
      const path = await getRepo(url, options);
      await callback(path);
      await rm(path, { recursive: true });
    }
  });
