  <img src="logo.png" align="right" width="20%"/>

# MMP

- Modular Minecraft Proxy

# How does this differ from other proxies? (such as SMP)

## Type Safety

Instead of JavaScript, TypeScript is used which allows for type checking of the code and less bugs.

No more cleint, sever or posiotin!

## Multi-Threading

For every client that connects a new thread is created.

While also offering minimal performance gains (as there probably isn't (and shouldn't) be ever more then one client) makes it so that program instances client-based instead of being shared between all clients.

This makes a Singleton-like architecture possible without needing to worry about multiple instances of the same plugin and explicit declaration of dependencies.

Data can be sent between instances via [IPC](https://en.wikipedia.org/wiki/Inter-process_communication).

## Modularity

Other proxies came pre-installed with plugins which most time were private meaning that you couldn't share the project with the public.

They also had a monolithic boilerplate-y settings file with many placeholders.

This repo is only the loader which has only the responsibility of proxy-ing the connection, manipulating packets, managing threads and loading modules.

## Installation, Development and Distribution

The [MMP Module Manager](https://github.com/DinheroDevelopmentGroup/modular-minecraft-proxy/tree/main/src/m3), more commonly abbreviated as m3, makes it really easy to work with modules!

To be able to use m3, remember to run `npm link` in the root project directory (`modular-minecraft-proxy`).

By simply running `m3`, you will be met with a help menu that can be used exclusively as your guide.
`m3 help [command]` can be used for more detailed information.

(But a textual guide is still available here.)

To install modules, use the `m3 install` command, semi-official modules can be found [in this organization](https://github.com/orgs/DinheroDevelopmentGroup/repositories?q=mmp.), the repositories are all prefixed by `mmp.`.

For example, you can install the chat library by running `m3 install https://github.com/DinheroDevelopmentGroup/mmp.chat.git`, which will give you access to helpers that make it much easier to work with Minecraft chat.

I then recommend creating a `test` folder inside of `<project root>/src/modules/`, which is going to be your own module where you can _test_ the modules you install.

Create a `local.ts` file inside of `test` and add the following code:

```ts
import chat from '../ddg.chat/local.js';

chat.upstream.on('message', (packet) => {
  if (packet.canceled) return;

  packet.data.message += '!';
});
```

After running and connecting to the proxy, this will suffix all your messages with `!`, how cool is that?!

Tinker with the code and see what you can create.
Remember to always have fun!

### Old Manual Way

While you still can install modules manually, it's not recommended.

The dynamic nature of the project will make it very easy to install, develop and distribute modules.

To install simply `cd` into to the `modules` directory create add the module(s) there (via `git clone` or similar).

To develop simply create a sub-directory under the `modules` directory, you can test your module by running the loader.

To distribute simply create a repository in the `modules` directory and then share it via something like [github](https://github.com/).
