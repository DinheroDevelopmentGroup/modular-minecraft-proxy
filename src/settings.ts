import { readFile } from 'fs/promises';
import { type ClientOptions, type ServerOptions } from 'minecraft-protocol';

const VERSION = process.env.VERSION ?? '1.19.4';

const TARGET_HOST = process.env.TARGET_HOST;
const TARGET_PORT = parseInt(process.env.TARGET_PORT ?? '25565');
const TARGET_USERNAME = process.env.TARGET_USERNAME;
const TARGET_AUTH = process.env.TARGET_AUTH;

interface TargetOptions extends Omit<ClientOptions, 'username'> {
  username?: ClientOptions['username'];
}

export const TARGET_OPTIONS: TargetOptions = {
  host: TARGET_HOST,
  port: TARGET_PORT,
  version: VERSION,
};

if (TARGET_USERNAME !== undefined) TARGET_OPTIONS.username = TARGET_USERNAME;
if (TARGET_AUTH !== undefined)
  TARGET_OPTIONS.auth = TARGET_AUTH as 'offline' | 'microsoft' | 'mojang';

const SERVER_HOST = process.env.SERVER_HOST ?? '127.0.0.1';
const SERVER_PORT = parseInt(process.env.SERVER_PORT ?? '25565');
const SERVER_MOTD = process.env.SERVER_MOTD ?? `${TARGET_HOST}:${TARGET_PORT}`;

export const SERVER_OPTIONS: ServerOptions = {
  host: SERVER_HOST,
  port: SERVER_PORT,
  version: VERSION,
  motd: SERVER_MOTD,
  favicon:
    'data:image/png;base64,' + (await readFile('./favicon.png', 'base64')),
};
