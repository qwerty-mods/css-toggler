const { Plugin } = require('powercord/entities');
const { getModule } = require('powercord/webpack');
const { SpecialChannels: { CSS_SNIPPETS } } = require('powercord/constants');
const { inject, uninject } = require('powercord/injector');
const { findInReactTree } = require('powercord/util');

const commands = require('./commands');

module.exports = class CSSToggler extends Plugin {
    constructor () {
        super();

        this.injections = [];
    }

    get moduleManager () {
      return powercord.pluginManager.get('pc-moduleManager');
    }

    startPlugin () {
        // TODO: Deleting snippet via message and command
        // TODO: Enabling snippets via command or settings
        // TODO: Disabling ^^
        // TODO: Name different snippets differently (and potentially descriptions) for easier access

        this.patchSnippetButton();
        this.registerMainCommand();
    }

    pluginWillUnload () {
        this.injections.forEach(id => uninject(id));

        powercord.api.commands.unregisterCommand('snippet');
    }

    async patchSnippetButton () {
      const MiniPopover = await getModule(m => m.default?.displayName === 'MiniPopover');
      this.inject('css-toggler-snippet-button', MiniPopover, 'default', (_, res) => {
        const props = findInReactTree(res, n => n && n.message && n.setPopout);
        if (!props || props.channel.id !== CSS_SNIPPETS) {
          return res;
        }

        const __$oldSnippetButton = findInReactTree(res.props.children, n => n.type?.name === 'SnippetButton');
        if (__$oldSnippetButton) {
            this.log(__$oldSnippetButton);
        }

        return res;
      });

      MiniPopover.default.displayName = 'MiniPopover';
    }

    registerMainCommand () {
        powercord.api.commands.registerCommand({
            command: 'snippet',
            description: 'Utility commands to manage your snippets with ease',
            usage: '{c} <add, delete, enable, disable> <id>',
            executor: (args) => {
                const subcommand = commands[args[0]];
                if (!subcommand) {
                  return {
                    send: false,
                    result: `\`${args[0]}\` is not a valid sub-command. Please specify one of these instead: ${Object.keys(commands).map(cmd => `\`${cmd}\``).join(', ')}.`
                  };
                }

                return subcommand.executor(args.slice(1), this);
            },
            autocomplete: (args) => {
                if (args[0] !== void 0 && args.length === 1) {
                  return {
                    commands: Object.values(commands).filter(({ command }) => command.includes(args[0].toLowerCase())),
                    header: 'Snippet Subcommands'
                  };
                }

                const subcommand = commands[args[0]];
                if (!subcommand || !subcommand.autocomplete) {
                  return false;
                }

                return subcommand.autocomplete(args.slice(1), this.settings);
            }
        });
    }

    inject (id, ...args) {
        inject(id, ...args);

        this.injections.push(id);
    }
}