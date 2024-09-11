import { confirm, input } from '@inquirer/prompts';
import { Argument } from 'commander';
import { cp, mkdir, readFile, writeFile } from 'fs/promises';
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

  .option('-f, --override', 'Overwrite existing module')

  .addArgument(new Argument('[name]', 'Name of the module').default(moduleDir))
  .option('--author <author>', 'Author of the module')
  .option('--license <license>', 'License of the module')
  .option('--description <description>', 'Description of the module')

  .option('--git', 'Create a git repository')
  .option('--npm', 'Create a package.json file')

  .option('--gitattributes', 'Create a .gitattributes file')
  .option('--gitignore', 'Create a .gitignore file')
  .option('--readme', 'Create a README.md file')

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

        gitattributes?: boolean;
        gitignore?: boolean;
        readme?: boolean;
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

      const gitattributes =
        options.gitattributes ??
        (await confirm({
          message: 'Create a .gitattributes file?',
          default: true,
        }));
      const gitignore =
        options.gitignore ??
        (await confirm({
          message: 'Create a .gitignore file?',
          default: true,
        }));
      const readme =
        options.readme ??
        (await confirm({
          message: 'Create a README.md file?',
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

        gitattributes,
        gitignore,
        readme,
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

  gitattributes: boolean;
  gitignore: boolean;
  readme: boolean;
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
        const stdout = task.stdout() as Writable;

        await run(
          'git',
          ['init', '--initial-branch=main'],
          { cwd: directory },
          { stdout, stderr: stdout },
        );
      },
    });
  }

  if (options.npm) {
    tasks.push({
      title: 'Initialize npm',
      task: async (_ctx, task) => {
        const stdout = task.stdout() as Writable;

        await run(
          'npm',
          ['init', '-y'],
          { cwd: directory },
          { stdout, stderr: stdout },
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

  // <repo>/src/modules/ <--
  const mmpDir = resolve(modulesDir, '../..');

  if (options.gitattributes) {
    tasks.push({
      title: 'Create .gitattributes',
      task: async () => {
        await cp(
          resolve(mmpDir, '.gitattributes'),
          resolve(directory, '.gitattributes'),
        );
      },
    });
  }

  if (options.gitignore) {
    tasks.push({
      title: 'Create .gitignore',
      task: async (_ctx, task) => {
        task.output = 'Fetching .gitignore... (awaiting response)';
        const response = await fetch(
          'https://raw.githubusercontent.com/github/gitignore/master/Node.gitignore',
        );

        task.output = 'Fetching .gitignore... (awaiting text)';
        let gitignore = await response.text();

        // I personally do not like how Prettier un-inlined
        // this but don't know an easy way to change it
        gitignore += ['', '# M3', 'm3.local.json', ''].join('\n');

        task.output = 'Writing file...';
        await writeFile(resolve(directory, '.gitignore'), gitignore);
      },
    });
  }

  if (options.readme) {
    tasks.push({
      title: 'Create README.md',
      task: async () => {
        const readmeName = options.name.split('.').pop()!;

        const readme = [
          `# ${readmeName}`,
          '',
          'This is an [MMP](https://github.com/DinheroDevelopmentGroup/modular-minecraft-proxy) module.',
          'Generated using [M3](https://github.com/DinheroDevelopmentGroup/modular-minecraft-proxy/tree/main/src/m3) init.',
          '',
        ].join('\n');

        await writeFile(resolve(directory, 'README.md'), readme);
      },
    });
  }

  await new Listr(tasks, {
    concurrent: true,
    exitOnError: false,
    collectErrors: 'minimal',
  }).run();
}
