import { type Dirent } from 'fs';
import { readdir } from 'fs/promises';
import { resolve } from 'path';

import { exists } from './file.js';
import { type AsyncVoid } from './types.js';

export interface Callbacks {
  pre?: (entry: Dirent) => AsyncVoid;
  post?: (entry: Dirent) => AsyncVoid;
  error?: (error: Error, entry: Dirent) => AsyncVoid;
}

async function* importPhaseGenerator(
  directory: string,
  index: string,
  callbacks?: Callbacks,
): AsyncGenerator<unknown> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const path = resolve(entry.parentPath, entry.name, index);
    if (!(await exists(path))) continue;

    try {
      const preCallback = callbacks?.pre;
      if (preCallback !== undefined) await preCallback(entry);

      yield await import(path);

      const postCallback = callbacks?.post;
      if (postCallback !== undefined) await postCallback(entry);
    } catch (error) {
      const errorCallback = callbacks?.error;
      if (errorCallback === undefined) throw error;

      await errorCallback(error as Error, entry);
    }
  }
}

export const MODULES_DIR_PATH = resolve(import.meta.dirname, '../modules');

const installedModulesArray = (
  await readdir(MODULES_DIR_PATH, { withFileTypes: true })
)
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const installedModules = new Set(installedModulesArray);

// TODO: listr2?
// https://listr2.kilic.dev/
export async function* importModulesGenerator(
  directory: string,
  index: string,
  callbacks: Callbacks = {},
): AsyncGenerator<unknown> {
  yield* importPhaseGenerator(directory, index, {
    ...callbacks,
    post: async (entry) => {
      const ifpresentPath = resolve(entry.parentPath, entry.name, 'ifpresent');
      if (await exists(ifpresentPath)) {
        for (const entry of await readdir(ifpresentPath, {
          withFileTypes: true,
        })) {
          if (!entry.isDirectory()) continue;

          if (!installedModules.has(entry.name)) continue;

          const path = resolve(entry.parentPath, entry.name, index);
          if (!(await exists(path))) continue;

          await import(path);
        }
      }

      if (callbacks.post !== undefined) {
        await callbacks.post(entry);
      }
    },
  });
}

export async function importModules(
  directory: string,
  index: string,
  callbacks: Callbacks = {},
): Promise<void> {
  for await (const _ of importModulesGenerator(directory, index, callbacks)) {
    /* empty */
  }
}

// export const importModules = asyncIteratorFunctionToFunction(
//   importModulesGenerator,
// );

// function asyncIteratorFunctionToFunction<TArgs extends unknown[]>(
//   f: (...args: TArgs) => AsyncIteratorObject<unknown>,
// ): (...args: TArgs) => Promise<void> {
//   return async (...args: TArgs) => {
//     const iterator = f(...args);

//     await consumeAsyncIterator(iterator);
//   };
// }

// async function consumeAsyncIterator(
//   iterator: AsyncIteratorObject<unknown>,
// ): Promise<void> {
//   for await (const _ of iterator) {
//     /* empty */
//   }
// }
