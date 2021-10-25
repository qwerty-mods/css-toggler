const { Plugin } = require('powercord/entities');
const { React, getModule } = require('powercord/webpack');
const { SpecialChannels: { CSS_SNIPPETS } } = require('powercord/constants');
const { inject, uninject } = require('powercord/injector');
const { findInReactTree } = require('powercord/util');

const i18n = require('./i18n');
const commands = require('./commands');
const Settings = require('./components/Settings');
const SnippetButton = require('./components/SnippetButton');

const fs = require('fs');
const path = require('path');
const moment = getModule([ 'momentProperties' ], false);

const userStore = getModule([ 'getNullableCurrentUser' ], false);
const userProfileStore = getModule([ 'fetchProfile' ], false);

module.exports = class CSSToggler extends Plugin {
    constructor () {
        super();

        this.injections = [];
        this.snippetsCache = path.join(__dirname, '.cache', 'snippets.json');
    }

    get cachedSnippets () {
        if (!fs.existsSync(this.snippetsCache)) {
            fs.writeFileSync(this.snippetsCache, JSON.stringify('[]', null, 2));
        }

        const cachedSnippets = JSON.parse(fs.readFileSync(this.snippetsCache, 'utf8'));

        return cachedSnippets;
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
            render: Settings
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

                return subcommand.autocomplete(args.slice(1), this);
            }
        });
    }

    inject (id, ...args) {
        inject(id, ...args);

        this.injections.push(id);
    }

    _getSnippets () {
        const snippets = {};
        const snippetMatches = this.moduleManager._quickCSS.matchAll(/(\/[*]{2}[^]+?Snippet ID: \d+\n \*\/)\n([^]+?)\n(\/[*]{2} \d+ \*\/)/g);

        for (const snippet of snippetMatches) {
            const [ _, header, content, footer ] = snippet;

            if (!content.includes('Snippet ID:')) {
                const id = header.match(/Snippet ID: (\d+)/)[1];
                const appliedString = header.match(/(\d+ \w+ \d+(.+ )?\d+:\d+:\d+)/)[1];
                const appliedTimestamp = moment(appliedString, 'DD MMM YYYY HH:mm:ss').valueOf();

                snippets[id] = { header, content, footer, timestamp: appliedTimestamp };
            }
        }

        return snippets;
    }

    _removeSnippet (messageId) {
        let quickCSS = this.moduleManager._quickCSS;
        const snippets = quickCSS.split(/(\/\*\*[^]+?\*\/)/).filter(c => c !== '\n\n' && c !== '');

        const snippetParts = {
            header: '',
            content: '',
            footer: ''
        };

        snippets.forEach((line, index) => {
            if (line.includes(`Snippet ID: ${messageId}`)) {
                snippetParts.header = line;
                snippetParts.content = snippets[index + 1];
            } else if (line.match(/\/\*\* \d+ \*\//)) {
                snippetParts.footer = line;
            }
        });

        if (snippetParts.header && snippetParts.content && snippetParts.footer) {
            quickCSS = quickCSS.replace(`${snippetParts.header}${snippetParts.content}${snippetParts.footer}`, '');

            this.moduleManager._saveQuickCSS(quickCSS);
        }
    }

    async _toggleSnippet (messageId, enable) {
        if (enable) {
            const snippet = this.cachedSnippets.find(snippet => snippet.id === messageId);
            const author = userStore.getUser(snippet.author) || await userProfileStore.getUser(snippet.author);

            this.moduleManager._applySnippet({
                author,
                id: messageId,
                content: `\`\`\`css\n${snippet.content}\n\`\`\``
            });

            const newSnippets = this.cachedSnippets.filter(snippet => snippet.id !== messageId);

            fs.promises.writeFile(this.snippetsCache, JSON.stringify(newSnippets, null, 2));
        } else {
            const snippets = this._getSnippets();

            if (snippets[messageId] && !this.cachedSnippets.find(snippet => snippet.id === messageId)) {
                const snippet = snippets[messageId];
                snippet.author = snippet.header.match(/#\d{4} \((\d{16,20})\)/)[1];
                snippet.id = messageId;

                const newSnippets = [ ...this.cachedSnippets, {
                    id: snippet.id,
                    author: snippet.author,
                    content: snippet.content,
                    timestamp: snippet.timestamp
                } ];

                fs.promises.writeFile(this.snippetsCache, JSON.stringify(newSnippets, null, 2));

                this._removeSnippet(messageId);
            }
        }
    }
}