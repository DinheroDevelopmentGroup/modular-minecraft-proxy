import type { ChildProcess, SpawnOptions } from 'child_process';
import { spawn } from 'child_process';
import type { Readable, Writable } from 'stream';

export interface Stdio {
  stdin?: Readable;
  stdout?: Writable;
  stderr?: Writable;
}

export async function run(
  command: string,
  args: string[],
  options: SpawnOptions,
  stdio?: Stdio,
): Promise<ChildProcess> {
  const child = spawn(command, args, options);

  if (stdio !== undefined) {
    if (child.stdin !== null) stdio.stdin?.pipe(child.stdin);
    if (stdio.stdout !== undefined) child.stdout?.pipe(stdio.stdout);
    if (stdio.stderr !== undefined) child.stderr?.pipe(stdio.stderr);
  }

  await new Promise<void>((resolve, reject) => {
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });

  return child;
}
