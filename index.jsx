const { Plugin } = require('powercord/entities');
const { React, Flux, getModule, getModuleByDisplayName, i18n: { Messages } } = require('powercord/webpack');
const { Clickable, Tooltip, Icon } = require('powercord/components');
const { resolveCompiler } = require('powercord/compilers');
const { findInReactTree, getOwnerInstance } = require('powercord/util');

const injector = require('powercord/injector');

const i18n = require('./i18n');
const commands = require('./commands');
const Settings = require('./components/Settings');
const SnippetButton = require('./components/SnippetButton');
const SnippetManager = require('./managers/snippets');

const { CommandResultColors } = require('./constants');
const QuickCssIcon = require('./components/QuickCssIcon');

module.exports = class CSSToggler extends Plugin {
  constructor () {
    super();

    this.injections = [];
  }

  get moduleManager () {
    return powercord.api.moduleManager;
  }

  startPlugin () {
    this.watchQuickCSSFile();
    this.loadStylesheet('./style.css');

    this.snippetStore = require('./stores/snippetStore');
    this.snippetManager = new SnippetManager(this);

    powercord.api.i18n.loadAllStrings(i18n);

    const ConnectedSettings = Flux.connectStores([ this.snippetStore ], () => ({
      snippets: this.snippetStore.getSnippets({
        includeCached: true,
        includeDetails: true
      })
    }))(Settings);

    powercord.api.settings.registerSettings(this.entityID, {
      category: 'css-toggler',
      label: 'CSS Toggler',
      render: (props) => React.createElement(ConnectedSettings, {
        ...props,
        main: this
      })
    });

    this.addSettingsJump();
    this.patchSettingsPage();
    this.patchSnippetButton();
    this.registerMainCommand();
    this.patchChannelHeader();
  }

  pluginWillUnload () {
    this.injections.forEach(injector.uninject);

    this._quickCSS.compiler.on('src-update', this._quickCSS.compile);
    this._quickCSS.compiler.disableWatcher();

    powercord.api.settings.unregisterSettings('css-toggler');
    powercord.api.commands.unregisterCommand('snippet');
  }

  async addSettingsJump () {
    const settingsModule = getModule([ 'open', 'saveAccountChanges' ], false);

    try {
      const AsyncQuickCSS = require('../../src/Powercord/coremods/moduleManager/components/manage/QuickCSS');
      const ConnectedQuickCSS = await AsyncQuickCSS.type().props._provider();
      const QuickCSS = ConnectedQuickCSS.prototype.render.call({ memoizedGetStateFromStores: () => ({}) }).type;

      this.inject('css-toggler-settings-jump', QuickCSS.prototype, 'render', (_, res) => {
        const header = findInReactTree(res, n => n.props?.className === 'powercord-quickcss-header');
        if (header) {
          header.props.children[1].props.children.unshift(
            <Tooltip text={Messages.CSS_TOGGLER_GO_TO_CSS_TOGGLER_TOOLTIP} position='left'>
              <Clickable onClick={() => settingsModule.open(this.entityID)} className='button'>
                <svg className='css-toggler-jump-icon' viewBox='0 0 24 24' width="24">
                  <path fill="currentColor" d="M19 18c0 1.104-.896 2-2 2s-2-.896-2-2 .896-2 2-2 2 .896 2 2zm-14-3c-1.654 0-3 1.346-3 3s1.346 3 3 3h14c1.654 0 3-1.346 3-3s-1.346-3-3-3h-14zm19 3c0 2.761-2.239 5-5 5h-14c-2.761 0-5-2.239-5-5s2.239-5 5-5h14c2.761 0 5 2.239 5 5zm0-12c0 2.761-2.239 5-5 5h-14c-2.761 0-5-2.239-5-5s2.239-5 5-5h14c2.761 0 5 2.239 5 5zm-15 0c0-1.104-.896-2-2-2s-2 .896-2 2 .896 2 2 2 2-.896 2-2z" />
                </svg>
              </Clickable>
            </Tooltip>
          );
        }

        return res;
      });
    } catch (e) {
      this.error('Failed to inject into \'QuickCSS\' panel!', e);
    }
  }

  async patchSettingsPage () {
    const ErrorBoundary = require('../../src/Powercord/coremods/settings/components/ErrorBoundary');

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
    const ConnectedSnippetButton = Flux.connectStores([ this.snippetStore ], ({ message }) => ({
      applied: this.snippetStore.getSnippet(message.id) !== undefined
    }))(SnippetButton);

    const MiniPopover = await getModule(m => m.default?.displayName === 'MiniPopover');
    this.inject('css-toggler-snippet-button', MiniPopover, 'default', (_, res) => {
      const props = findInReactTree(res, n => n && n.message && n.setPopout);
      if (!props || !props.message) {
        return res;
      }

      const { message } = props;

      const defaultProps = {
        message,
        moduleManager: this.moduleManager,
        main: this
      };

      const __$oldSnippetButton = findInReactTree(res.props.children, n => n.type?.name === 'SnippetButton');
      if (__$oldSnippetButton) {
        const buttons = res.props.children;
        const snippetButtonIndex = buttons.findIndex(n => n === __$oldSnippetButton);

        buttons.splice(snippetButtonIndex, 1, <ConnectedSnippetButton {...defaultProps} />);
      } else if (message.content.match(/`{3}css\n([\s\S]*)`{3}/ig)) {
        res.props.children.splice(res.props.children.length - 1, 0, <ConnectedSnippetButton {...defaultProps} />);
      }

      return res;
    });

    MiniPopover.default.displayName = 'MiniPopover';
  }

  async patchChannelHeader () {
    const HeaderBarContainer = await getModule(m=> m?.default?.displayName === 'HeaderBar');
    this.inject('css-toggler-header-bar', HeaderBarContainer, 'default', (args, res) => {
      if (this.settings.get('show-quick-header', true)) {
        findInReactTree(res, i => i[i.length - 1]?.key === 'members').unshift(
          <QuickCssIcon main={this} />
        );
      }

      return res;
    });

    const classes = getModule([ 'title', 'chatContent' ], false);
    const toolbar = document.querySelector(`.${classes.title}`);

    if (toolbar) {
      getOwnerInstance(toolbar)?.forceUpdate?.();
    }
  }

  watchQuickCSSFile () {
    const { _quickCSS, _quickCSSFile, _quickCSSElement } = this.moduleManager;

    const compiler = resolveCompiler(_quickCSSFile);
    const compile = async () => {
      _quickCSSElement.innerHTML = await compiler.compile();

      if (_quickCSS !== _quickCSSElement.innerHTML) {
        this.moduleManager._quickCSS = _quickCSSElement.innerHTML;
        this.snippetManager.fetchSnippets();
      }
    };

    this._quickCSS = {
      compiler,
      compile
    };

    compiler.enableWatcher();
    compiler.on('src-update', compile);

    return compile();
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
              color: CommandResultColors.ERROR,
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

  inject (id, ...args) {
    injector.inject(id, ...args);

    this.injections.push(id);
  }
}