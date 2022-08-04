const { FluxDispatcher, getModule, constants: { ActionTypes, Routes }, i18n: { Messages } } = require('powercord/webpack');
const { GUILD_ID, SpecialChannels: { CSS_SNIPPETS } } = require('powercord/constants');
const { MAX_CUSTOM_SNIPPET_ID_RANGE, FluxActions } = require('../constants');

const moment = getModule([ 'momentProperties' ], false);
const userStore = getModule([ 'initialize', 'getCurrentUser' ], false);
const channelStore = getModule([ 'getDMFromUserId', 'getChannel' ], false);
const userProfileStore = getModule([ 'fetchProfile' ], false);

const { transitionTo } = getModule([ 'transitionTo' ], false);

let toasts = [];

function sendToast (id, enabled, callback) {
  const statusText = enabled === true ? 'Enabled' : enabled === false ? 'Disabled' : 'Removed';
  const snippet = this.snippetStore.getSnippet(id, { includeDetails: true });

  const toastId = `css-toggler-${id}-${Math.random().toString(36)}`;
  toasts.push(toastId);

  powercord.api.notices.sendToast(toastId, {
    header: `${statusText} Snippet`,
    timeout: 5e3,
    content: `You've ${statusText.toLowerCase()} snippet '${snippet.details?.title ? snippet.details.title : id}'`,
    buttons: [
      toasts.length > 1 && {
        text: Messages.CSS_TOGGLER_DISMISS_ALL,
        look: 'ghost',
        size: 'small',
        onClick: () => toasts.forEach(id => powercord.api.notices.closeToast(id))
      },
      {
        text: Messages.DISMISS,
        look: 'ghost',
        size: 'small'
      },
      snippet.custom && enabled === null ? null : {
        text: enabled === true ? Messages.DISABLE : enabled === false ? Messages.ENABLE : Messages.JUMP_TO_MESSAGE,
        look: 'ghost',
        size: 'small',
        onClick: () => callback(id, snippet.channel)
      }
    ].filter(Boolean)
  });
}

powercord.api.notices.on('toastLeaving', (toastId) => {
  if (toastId.startsWith('css-toggler-')) {
    toasts = toasts.filter(id => toastId !== id);
  }
});

const { getSetting, updateSetting } = powercord.api.settings._fluxProps('css-toggler');

module.exports = class SnippetManager {
  constructor (main) {
    this.main = main;
    this.snippetDetails = main.settings.get('snippetDetails', {});
    this.snippetStore = main.snippetStore;

    this.fetchSnippets();
  }

  fetchSnippets () {
    const snippets = {};
    const snippetMatches = this.main.moduleManager._quickCSS.matchAll(/(\/[*]{2}[^]+?Snippet ID: (\d+)\n \*\/)\n([^]+?)\n(\/[*]{2} \d+ \*\/)/g);

    for (const snippet of snippetMatches) {
      const [ _, header, id, content, footer ] = snippet;

      if (!content.includes('Snippet ID:')) {
        const appliedString = header.match(/(\w+ \d+, \d{4}(.+ )?\d+:\d+:\d+ \w+)|(\d+ \w+ \d+(.+ )?\d+:\d+:\d+)/)[0];
        const appliedTimestamp = moment(appliedString, 'DD MMM YYYY HH:mm:ss').valueOf() || moment(appliedString, 'MMM DD YYYY at HH:mm:ss A').valueOf();
        const channel = header.match(/#.+ \((\d{16,20})\) /)?.[1];
        const author = header.match(/#\d{4} \((\d{16,20})\)/)[1];

        snippets[id] = { header, content, footer, author, channel, timestamp: appliedTimestamp };

        if (!channel) {
          delete snippets[id].channel;
        }
      }
    }

    FluxDispatcher.dispatch({
      type: FluxActions.SNIPPETS_FETCH,
      snippets
    });

    return snippets;
  }

  toggleCollapse (id) {
    const collapsedSnippets = getSetting('collapsedSnippets', []);

    if (collapsedSnippets.includes(id)) {
      collapsedSnippets.splice(collapsedSnippets.indexOf(id), 1);
    } else {
      collapsedSnippets.push(id);
    }

    updateSetting('collapsedSnippets', collapsedSnippets);
  }

  jumpToSnippet (messageId, channelId) {
    let guildId;

    FluxDispatcher.dispatch({ type: ActionTypes.LAYER_POP });

    if (channelId) {
      const channel = channelStore.getChannel(channelId);
      guildId = channel.guild_id;
    }

    transitionTo(Routes.CHANNEL(guildId || GUILD_ID, channelId || CSS_SNIPPETS, messageId));
  }

  updateSnippetDetails (id, newDetails) {
    if (typeof newDetails !== 'object') {
      return;
    }

    this.snippetDetails[id] = {
      title: newDetails.title ?? this.snippetDetails[id]?.title,
      description: newDetails.description ?? this.snippetDetails[id]?.description
    };

    if (!this.snippetDetails[id].title) {
      delete this.snippetDetails[id].title;
    }

    if (!this.snippetDetails[id].description) {
      delete this.snippetDetails[id].description;
    }

    if (!this.snippetDetails[id].title && !this.snippetDetails[id].description) {
      delete this.snippetDetails[id];
    }

    updateSetting('snippetDetails', this.snippetDetails);
  }

  async updateSnippet (id, content) {
    const snippet = this.snippetStore.getSnippet(id);

    if (snippet) {
      if (snippet.content === content) {
        return;
      }

      let quickCSS = this.main.moduleManager._quickCSS;
      const match = quickCSS.match(new RegExp(`${global._.escapeRegExp(`${snippet.header}\n${snippet.content}\n${snippet.footer}`)}`));

      if (match) {
        const newSnippet = match[0].replace(snippet.content, content);

        quickCSS = quickCSS.replace(match[0], newSnippet);

        await this.main.moduleManager._saveQuickCSS(quickCSS);
      }
    } else {
      throw new Error(`Snippet '${id}' not found!`);
    }
  }

  async removeSnippet (id, options) {
    if (this.snippetStore.isEnabled(id)) {
      let quickCSS = this.main.moduleManager._quickCSS;
      const snippets = quickCSS.split(/(\/\*\*[^]+?\*\/)/).filter(c => c !== '\n\n' && c !== '');

      const snippetParts = {
        header: '',
        content: '',
        footer: ''
      };

      snippets.forEach((line, index) => {
        if (line.includes(`Snippet ID: ${id}`)) {
          snippetParts.header = line;
          snippetParts.content = snippets[index + 1];

          if (snippets[index + 2].match(/\/\*\* \d+ \*\//)) {
            snippetParts.footer = snippets[index + 2];
          }
        }
      });

      if (snippetParts.header && snippetParts.content && snippetParts.footer) {
        quickCSS = quickCSS.replace(`${snippetParts.header}${snippetParts.content}${snippetParts.footer}`, '');

        await this.main.moduleManager._saveQuickCSS(quickCSS);
      } else {
        throw new Error(`Snippet '${id}' not found!`);
      }
    }

    if (options?.showToast === true) {
      sendToast.call(this, id, null, this.jumpToSnippet);
    }

    delete options?.showToast;

    FluxDispatcher.dispatch({
      type: FluxActions.SNIPPET_REMOVE,
      options,
      id
    });
  }

  addSnippet (message) {
    if (typeof message !== 'object') {
      return;
    }

    const snippet = this.snippetStore.getSnippet(message.id);

    if (!snippet) {
      if (message.channel_id === CSS_SNIPPETS) {
        this.main.moduleManager._applySnippet(message);
      } else {
        this.applySnippet(message, parseInt(message.id) < MAX_CUSTOM_SNIPPET_ID_RANGE);
      }
    } else {
      throw new Error(`Snippet '${snippet.id}' already exists!`);
    }
  }

  applySnippet (message, customSnippet = false) {
    let quickCSS = this.main.moduleManager._quickCSS;
    let css = '\n\n/**\n';

    const channel = channelStore.getChannel(message.channel_id);

    let line1 = Messages[customSnippet ? 'CSS_TOGGLER_SNIPPET_FORMAT_LINE1' : 'POWERCORD_SNIPPET_LINE1'].format({ date: new Date() });

    if (channel && channel.id !== CSS_SNIPPETS) {
      line1 = line1.replace('css-snippets', `${channel.name} (${channel.id})`);
    }

    const line2 = Messages.POWERCORD_SNIPPET_LINE2.format({
      authorTag: message.author.tag,
      authorId: message.author.id
    });

    css += ` * ${line1}\n`;
    css += ` * ${line2}\n`;
    css += ` * Snippet ID: ${message.id}\n`;
    css += ' */\n';

    if (customSnippet) {
      css += `${message.content}\n`;
    } else {
      for (const match of message.content.matchAll(/`{3}css\n([\s\S]*)`{3}/ig)) {
        let snippet = match[1].trim();

        css += `${snippet}\n`;
      }
    }

    css += `/** ${message.id} */\n`;

    quickCSS += css;

    this.main.moduleManager._saveQuickCSS(quickCSS);
  }

  async enableSnippet (id) {
    const snippet = this.snippetStore.getSnippet(id);
    const enabled = this.snippetStore.isEnabled(id);

    if (snippet && !enabled) {
      const author = userStore.getUser(snippet.author) || await userProfileStore.getUser(snippet.author).catch(() => null);
      if (!author) {
        throw new Error(`Unable to fetch snippet author for '${id}'!`);
      }

      const defaultArgs = {
        id,
        author,
        content: snippet.custom ? snippet.content : `\`\`\`css\n${snippet.content}\n\`\`\``
      };

      if (snippet.channel) {
        defaultArgs.channel_id = snippet.channel;
      }

      if (snippet.channel || snippet.custom) {
        this.applySnippet(defaultArgs, snippet.custom);
      } else {
        this.main.moduleManager._applySnippet(defaultArgs);
      }

      // FluxDispatcher.dispatch({
      //   type: FluxActions.SNIPPET_ENABLE,
      //   id
      // });

      return snippet;
    } else {
      throw new Error(snippet ? `Snippet '${id}' is already enabled!` : `Snippet '${id}' not found!`);
    }
  }

  async disableSnippet (id) {
    const snippet = this.snippetStore.getSnippet(id);
    const enabled = this.snippetStore.isEnabled(id);

    if (snippet && enabled) {
      await this.removeSnippet(id, { preserveSnippet: true });

      FluxDispatcher.dispatch({
        type: FluxActions.SNIPPET_DISABLE,
        id
      });

      return snippet;
    } else {
      throw new Error(snippet ? `Snippet '${id}' is already disabled!` : `Snippet '${id}' not found!`);
    }
  }

  async toggleSnippet (id, ...args) {
    const state = typeof args[0] === 'boolean' ? args[0] : !this.snippetStore.isEnabled(id);
    const options = typeof args[0] === 'object' ? args[0] : args[1] || {};

    if (state === true) {
      await this.enableSnippet(id);
    } else if (state === false) {
      await this.disableSnippet(id);
    }

    if (options?.showToast === true) {
      sendToast.call(this, id, state, this.toggleSnippet.bind(this));
    }
  }
};
