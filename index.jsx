const { Plugin } = require('powercord/entities');
const { React, getModule, getModuleByDisplayName } = require('powercord/webpack');
const { SpecialChannels: { CSS_SNIPPETS } } = require('powercord/constants');
const { findInReactTree } = require('powercord/util');

const injector = require('powercord/injector');

const i18n = require('./i18n');
const commands = require('./commands');
const Settings = require('./components/Settings');
const SnippetButton = require('./components/SnippetButton');
const SnippetManager = require('./managers/snippets');
const { Clickable, Tooltip, Icon } = require('powercord/components')

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
    this.loadStylesheet('./style.css');

    powercord.api.i18n.loadAllStrings(i18n);
    powercord.api.settings.registerSettings(this.entityID, {
      category: 'css-toggler',
      label: 'CSS Toggler',
      render: (props) => React.createElement(Settings, {
        ...props,
        main: this
      })
    });

    this.patchSettingsPage();
    this.patchSnippetButton();
    this.registerMainCommand();
    this.addSettingsJump();
  }

  pluginWillUnload () {
    this.injections.forEach(injector.uninject);

    powercord.api.settings.unregisterSettings('css-toggler');
    powercord.api.commands.unregisterCommand('snippet');
  }

  async patchSettingsPage () {
    const ErrorBoundary = require('../pc-settings/components/ErrorBoundary');

    const FormSection = getModuleByDisplayName('FormSection', false);
    const SettingsView = await getModuleByDisplayName('SettingsView');
    this.inject('css-toggler-settings-page', SettingsView.prototype, 'getPredicateSections', (_, sections) => {
      const changelog = sections.find(category => category.section === 'changelog');
      if (changelog) {
        const SettingsPage = sections.find(category => category.section === this.entityID);
        if (SettingsPage) {
          const SettingsElement = powercord.api.settings.tabs[this.entityID].render;

          SettingsPage.element = () => (
            <ErrorBoundary>
              <FormSection title={this.manifest.name} tag='h1'>
                <SettingsElement />
              </FormSection>
            </ErrorBoundary>
          );
        }
      }

      return sections;
    });
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
        const snippetButtonIndex = buttons.findIndex(n => n === __$oldSnippetButton);

        buttons.splice(snippetButtonIndex, 1, <SnippetButton message={props.message} moduleManager={this.moduleManager} main={this} />);
      }

      return res;
    });

    MiniPopover.default.displayName = 'MiniPopover';
  }

  registerMainCommand () {
    powercord.api.commands.registerCommand({
      command: 'snippet',
      description: 'Utility commands to manage your snippets with ease',
      usage: `{c} <${Object.keys(commands).join('|')}> <id>`,
      executor: (args) => {
        const subcommand = commands[args[0]];
        if (!subcommand) {
          return {
            send: false,
            result: {
              type: 'rich',
              color: 0xED4245,
              title: 'Invalid Subcommand',
              description: `\`${args[0]}\` is not a valid subcommand. Please specify one of these instead:`,
              fields: Object.keys(commands).map(key => ({
                name: key,
                value: commands[key].description,
                inline: true
              }))
            }
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

  async addSettingsJump () {
    const settingsModule = getModule([ 'open', 'saveAccountChanges' ], false);
  
    const AsyncQuickCSS = require('../pc-moduleManager/components/manage/QuickCSS');
    const ConnectedQuickCSS = await AsyncQuickCSS.type().props._provider();
    const QuickCSS = ConnectedQuickCSS.prototype.render.call({ memoizedGetStateFromStores : () => ({}) }).type;
  
    this.inject('css-toggler-settings-jump', QuickCSS.prototype, 'render', (args, res) => {
      const header = findInReactTree(res, n => n.props?.className === 'powercord-quickcss-header');
      if (header) {
        header.props.children[1].props.children.splice(0, 0,
          <Tooltip text='Go To CSS Toggler'>
            <Clickable onClick={() => settingsModule.open(this.entityID)} className='button'>
              <Icon name='Reply' />
            </Clickable>
          </Tooltip>
        );
      }
  
      return res;
    });
  }

  inject (id, ...args) {
    injector.inject(id, ...args);

    this.injections.push(id);
  }
}