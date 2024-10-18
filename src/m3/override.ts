import { Command, Option } from 'commander';

import { override } from '../util/reflect.js';

// Please forgive me, I had to

// even if you extend Command, when chaining, it will return Command instead of the extended class
// thus, impossibilitating customization without monkey-patching

override(
  Command.prototype,
  'addOption',
  (original) =>
    function (this: Command, option: Option): Command {
      const result = original.call(this, option);

      if (
        option.long !== undefined &&
        !option.required &&
        !option.negate &&
        !option.optional
      ) {
        this.addOption(
          new Option(option.long.replace(/^--/, '--no-')).hideHelp(),
        );
      }

      return result;
    },
);
