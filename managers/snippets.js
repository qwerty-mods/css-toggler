const { FluxDispatcher, getModule, constants: { ActionTypes, Routes }, i18n: { Messages } } = require('powercord/webpack');
const { GUILD_ID, SpecialChannels: { CSS_SNIPPETS } } = require('powercord/constants');
const { FluxActions } = require('../constants');

const moment = getModule([ 'momentProperties' ], false);
const userStore = getModule([ 'getNullableCurrentUser' ], false);
const userProfileStore = getModule([ 'fetchProfile' ], false);

const { transitionTo } = getModule([ 'transitionTo' ], false);

let toasts = [];

function sendToast (id, enabled, callback) {
  const statusText = enabled === true ? 'Enabled' : enabled === false ? 'Disabled' : 'Removed';
  const snippetDetails = this.snippetDetails[id]

  const toastId = `css-toggler-${id}-${Math.random().toString(36)}`;
  toasts.push(toastId);

  powercord.api.notices.sendToast(toastId, {
    header: `${statusText} Snippet`,
    timeout: 5e3,
    content: `You've ${statusText.toLowerCase()} snippet '${snippetDetails?.title ? snippetDetails.title : id}'`,
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
      {
        text: enabled === true ? Messages.DISABLE : enabled === false ? Messages.ENABLE : Messages.JUMP_TO_MESSAGE,
        look: 'ghost',
        size: 'small',
        onClick: () => callback(id)
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
    const snippetMatches = this.main.moduleManager._quickCSS.matchAll(/(\/[*]{2}[^]+?Snippet ID: \d+\n \*\/)\n([^]+?)\n(\/[*]{2} \d+ \*\/)/g);

    for (const snippet of snippetMatches) {
      const [ _, header, content, footer ] = snippet;

      if (!content.includes('Snippet ID:')) {
        const id = header.match(/Snippet ID: (\d+)/)[1];
        const appliedString = header.match(/(\w+ \d+, \d{4}(.+ )?\d+:\d+:\d+ \w+)|(\d+ \w+ \d+(.+ )?\d+:\d+:\d+)/)[0];
        const appliedTimestamp = moment(appliedString, 'DD MMM YYYY HH:mm:ss').valueOf() || moment(appliedString, 'MMM DD YYYY at HH:mm:ss A').valueOf();
        const author = header.match(/#\d{4} \((\d{16,20})\)/)[1];

        snippets[id] = { header, content, footer, author, timestamp: appliedTimestamp };
      }
    }

    FluxDispatcher.dirtyDispatch({
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

  jumpToSnippet (messageId) {
    FluxDispatcher.dirtyDispatch({ type: ActionTypes.LAYER_POP });

    transitionTo(Routes.CHANNEL(GUILD_ID, CSS_SNIPPETS, messageId));
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

    FluxDispatcher.dirtyDispatch({
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
      this.main.moduleManager._applySnippet(message);
    } else {
      throw new Error(`Snippet '${snippet.id}' already exists!`);
    }
  }

  async enableSnippet (id) {
    const snippet = this.snippetStore.getSnippet(id);
    const enabled = this.snippetStore.isEnabled(id);

    if (snippet && !enabled) {
      const author = userStore.getUser(snippet.author) || await userProfileStore.getUser(snippet.author).catch(() => null);
      if (!author) {
        throw new Error(`Unable to fetch snippet author for '${id}'!`);
      }

      this.main.moduleManager._applySnippet({
        id,
        author,
        content: `\`\`\`css\n${snippet.content}\n\`\`\``
      });

      FluxDispatcher.dirtyDispatch({
        type: FluxActions.SNIPPET_ENABLE,
        id
      });

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

      FluxDispatcher.dirtyDispatch({
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
