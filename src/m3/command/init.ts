import { confirm, input } from '@inquirer/prompts';
import { Argument } from 'commander';
import { mkdir, readFile, writeFile } from 'fs/promises';
import type { ListrTask } from 'listr2';
import { Listr } from 'listr2';
import { resolve } from 'path';
import type { Writable } from 'stream';

import { exists } from '../../util/file.js';
import { run } from '../process.js';
import program, { moduleDir, modulesDir } from '../program.js';
import {
  type GlobalModuleData,
  type LocalModuleData,
  type PackageJson,
  PackageJsonSchema,
} from '../types.js';

program
  .command('init')
  .description('Initialize a new module')
  .addArgument(new Argument('[name]', 'Name of the module').default(moduleDir))
  .option('--author <author>', 'Author of the module')
  .option('--license <license>', 'License of the module')
  .option('--description <description>', 'Description of the module')
  .option('-f, --override', 'Overwrite existing module')
  .option('--git', 'Create a git repository')
  .option('--npm', 'Create a package.json file')
  .action(
    async (
      name: string | undefined,
      options: {
        override?: boolean;

        author?: string;
        license?: string;
        description?: string;

        git?: boolean;
        npm?: boolean;
      },
    ) => {
      const override = options.override ?? false;

      name =
        name ??
        (await input({ message: 'Name of the module', default: moduleDir }));
      const author =
        options.author ??
        (await input({
          message: 'Author',
          default: 'Anonymous',
        }));
      const license =
        options.license ??
        (await input({
          message: 'License',
          default: 'MIT',
        }));
      const description =
        options.description ??
        (await input({
          message: 'Description',
          default: '',
        }));

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
        override,

        name,
        author,
        license,
        description,

        git,
        npm,
        m3: true,
      });
    },
  );

interface InitOptions {
  override: boolean;

  name: string;
  author: string;
  license: string;
  description: string;

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
          ['init', '--initial-branch=main'],
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

        task.output = 'reading file...';
        const before = await readFile(
          resolve(directory, 'package.json'),
          'utf8',
        );

        task.output = 'parsing json...';
        const unsafe: PackageJson = JSON.parse(before);

        task.output = 'validating schema...';
        const safe = PackageJsonSchema.parse(unsafe);

        safe.name = options.name;
        safe.author = options.author;
        safe.license = options.license;
        safe.description = options.description;

        task.output = 'serializing json...';
        const after = JSON.stringify(safe, undefined, 2);

        task.output = 'writing file...';
        await writeFile(resolve(directory, 'package.json'), after);
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
          JSON.stringify(global, undefined, 2),
        );

        await writeFile(
          resolve(directory, 'm3.local.json'),
          JSON.stringify(local, undefined, 2),
        );
      },
    });
  }

  await new Listr(tasks, {
    concurrent: true,
    exitOnError: false,
  }).run();
}
