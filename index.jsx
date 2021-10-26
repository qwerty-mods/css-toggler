const { Plugin } = require('powercord/entities');
const { React, getModule } = require('powercord/webpack');
const { SpecialChannels: { CSS_SNIPPETS } } = require('powercord/constants');
const { inject, uninject } = require('powercord/injector');
const { findInReactTree } = require('powercord/util');

const i18n = require('./i18n');
const commands = require('./commands');
const Settings = require('./components/Settings');
const SnippetButton = require('./components/SnippetButton');
const SnippetManager = require('./managers/snippets');

module.exports = class CSSToggler extends Plugin {
  constructor () {
    super();

    this.injections = [];
    this.snippetManager = new SnippetManager(this);
  }

  get moduleManager () {
    return powercord.pluginManager.get('pc-moduleManager');
  }

  startPlugin () {
    // TODO: Deleting snippet via message and command
    // TODO: Enabling snippets via command or settings
    // TODO: Disabling ^^
    // TODO: Name different snippets differently (and potentially descriptions) for easier access

    powercord.api.i18n.loadAllStrings(i18n);
    powercord.api.settings.registerSettings('css-toggler', {
      category: this.entityID,
      label: 'CSS Toggler',
      render: (props) => React.createElement(Settings, {toggleSnippet: this._toggleSnippet, ...props})
    });

    this.patchSnippetButton();
    this.registerMainCommand();
  }

  pluginWillUnload () {
    this.injections.forEach(id => uninject(id));

    powercord.api.settings.unregisterSettings('css-toggler');
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
        const buttons = res.props.children;
        const snippetButtonIndex = buttons.findIndex(n => n.type?.name === 'SnippetButton');

        buttons.splice(snippetButtonIndex, 1, <SnippetButton {...__$oldSnippetButton.props} moduleManager={this.moduleManager} main={this} />);
      }

      return res;
    });

    MiniPopover.default.displayName = 'MiniPopover';
  }

  registerMainCommand () {
    powercord.api.commands.registerCommand({
      command: 'snippet',
      description: 'Utility commands to manage your snippets with ease',
      usage: '{c} <subcommand> <id>',
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

        return subcommand.autocomplete(args.slice(1), this);
      }
    });
  }

  inject (id, ...args) {
    inject(id, ...args);

    this.injections.push(id);
  }
}