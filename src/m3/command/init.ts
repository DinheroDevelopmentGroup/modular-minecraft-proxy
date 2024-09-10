import { confirm, input } from '@inquirer/prompts';
import { Argument } from 'commander';
import { mkdir, writeFile } from 'fs/promises';
import type { ListrTask } from 'listr2';
import { Listr } from 'listr2';
import { resolve } from 'path';
import type { Writable } from 'stream';

import { exists } from '../../util/file.js';
import { run } from '../process.js';
import program, { moduleDir, modulesDir } from '../program.js';
import type { GlobalModuleData, LocalModuleData } from '../types.js';

program
  .command('init')
  .description('Initialize a new module')
  .addArgument(new Argument('[name]', 'Name of the module').default(moduleDir))
  .option('-f, --override', 'Overwrite existing module')
  .option('--git', 'Initialize a new git repository')
  .option('--npm', 'Initialize a new npm package')
  .action(
    async (
      name: string | undefined,
      options: { git?: boolean; npm?: boolean; override?: boolean },
    ) => {
      name =
        name ??
        (await input({ message: 'Name of the module', default: moduleDir }));
      const git =
        options.git ??
        (await confirm({
          message: 'Initialize a new git repo?',
          default: true,
        }));
      const npm =
        options.npm ??
        (await confirm({
          message: 'Initialize a new npm package?',
          default: true,
        }));

      await init({
        override: options.override ?? false,

        name,

        git,
        npm,
        m3: true,
      });
    },
  );

interface InitOptions {
  override: boolean;

  name: string;

  git: boolean;
  npm: boolean;
  m3: boolean;
}

async function init(options: InitOptions): Promise<void> {
  const directory = resolve(modulesDir, options.name);

  if (!options.override && (await exists(directory))) {
    throw new Error(`Module ${options.name} already exists`);
  }

  await mkdir(directory, { recursive: true });

  const tasks: ListrTask[] = [];

  if (options.git) {
    tasks.push({
      title: 'Initialize git',
      task: async (_ctx, task) => {
        await run(
          'git',
          ['init'],
          { cwd: directory },
          { stdout: task.stdout() as Writable },
        );
      },
    });
  }

  if (options.npm) {
    tasks.push({
      title: 'Initialize npm',
      task: async (_ctx, task) => {
        await run(
          'npm',
          ['init', '-y'],
          { cwd: directory },
          { stdout: task.stdout() as Writable },
        );
      },
    });
  }

  if (options.m3) {
    tasks.push({
      title: 'Initialize m3 json files',
      task: async (_ctx, _task) => {
        const global: GlobalModuleData = {
          name: options.name,
          dependencies: [],
        };

        const local: LocalModuleData = {
          manual: true,
        };

        await writeFile(
          resolve(directory, 'm3.global.json'),
          JSON.stringify(global),
        );

        await writeFile(
          resolve(directory, 'm3.local.json'),
          JSON.stringify(local),
        );
      },
    });
  }

  await new Listr(tasks, {
    concurrent: true,
    exitOnError: false,
  }).run();
}
