const { getModule } = require('powercord/webpack');

const fs = require('fs');
const path = require('path');
const moment = getModule([ 'momentProperties' ], false);

const userStore = getModule([ 'getNullableCurrentUser' ], false);
const userProfileStore = getModule([ 'fetchProfile' ], false);
const { transitionTo } = getModule([ 'transitionTo' ], false);

function sendToast(snippet, status, callback) {
  powercord.api.notices.sendToast(`css-toggler-${snippet.id}`, {
    header: `${status} Snippet`,
    timeout: 5000,
    content: `${status} snippet ${snippet.name ? snippet.name : snippet.id}`,
    buttons: [
      {
        text: 'Dismiss',
        look: 'ghost',
        size: 'small',
        onClick: () => powercord.api.notices.closeToast('status-changed')
      },
      {
        text: status === 'Enabled' ? 'Disable' : status === 'Disabled' ? 'Enable' : 'Jump to Message',
        look: 'ghost',
        size: 'small',
        onClick: () => {
          callback(snippet.id, status === 'Enabled');

          powercord.api.notices.closeToast('status-changed');
        }
      }
    ]
  });
}

const { updateSetting } = powercord.api.settings._fluxProps('css-toggler');

module.exports = class SnippetManager {
  constructor (main) {
    this.main = main;
    this.cacheFolder = path.join(__dirname, '..', '.cache');
    this.snippetCache = path.join(this.cacheFolder, 'snippets.json');
    this.snippetDetails = main.settings.get('snippetDetails', {});
  }

  get cachedSnippets () {
    if (!fs.existsSync(this.cacheFolder)) {
      fs.mkdirSync(this.cacheFolder);
    }

    if (!fs.existsSync(this.snippetCache)) {
      fs.writeFileSync(this.snippetCache, '[]');
    }

    const cachedSnippets = fs.readFileSync(this.snippetCache, 'utf8');

    return JSON.parse(cachedSnippets);
  }

  isEnabled (messageId) {
    return !this.cachedSnippets.find(snippet => snippet.id === messageId);
  }

  getSnippet (messageId, cachedOnly = false) {
    const snippets = this.getSnippets()
    if (!cachedOnly && snippets[messageId]) {
      const snippet = snippets[messageId];
      snippet.id = messageId;

      return snippet;
    }

    return this.cachedSnippets.find(snippet => snippet.id === messageId);
  }

  getSnippets (options) {
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

        if (options?.includeDetails === true) {
          snippets[id].details = this.snippetDetails[id];
        }
      }
    }

    if (options?.includeCached === true) {
      Object.assign(snippets, { ...this.cachedSnippets.reduce((cachedSnippets, snippet) => {
        if (options?.includeDetails === true) {
          snippet.details = this.snippetDetails[snippet.id];
        }

        return {
          ...cachedSnippets,
          [snippet.id]: snippet
        };
      }, {}) });
    }

    return snippets;
  }

  updateSnippetDetails (id, newDetails) {
    if (typeof newDetails !== 'object') {
      return;
    }

    this.snippetDetails[id] = this.snippetDetails[id] || {};

    Object.assign(this.snippetDetails[id], {
      title: newDetails.title ?? this.snippetDetails[id]?.title,
      description: newDetails.description ?? this.snippetDetails[id]?.description
    });

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

  removeSnippet (messageId, options) {
    if (!options?.clearFromCache) {
      let quickCSS = this.main.moduleManager._quickCSS;
      const snippets = quickCSS.split(/(\/\*\*[^]+?\*\/)/).filter(c => c !== '\n\n' && c !== '');

      const snippetParts = {
        id: '',
        header: '',
        content: '',
        footer: '',
        author: ''
      };

      snippets.forEach((line, index) => {
        if (line.includes(`Snippet ID: ${messageId}`)) {
          snippetParts.header = line;
          snippetParts.content = snippets[index + 1];

          if (snippets[index + 2].match(/\/\*\* \d+ \*\//)) {
            snippetParts.footer = snippets[index + 2];
          }
        }
      });

      if (snippetParts.header && snippetParts.content && snippetParts.footer) {
        quickCSS = quickCSS.replace(`${snippetParts.header}${snippetParts.content}${snippetParts.footer}`, '');

        this.main.moduleManager._saveQuickCSS(quickCSS);
      } else {
        throw new Error(`Snippet '${messageId}' not found!`);
      }
    }

    if (options?.showToast === true) {
      const snippet = this.getSnippets({ includeCached: true })[messageId];
      snippet.id = messageId;

      sendToast(snippet, 'Removed', (id) => transitionTo(`/channels/538759280057122817/755005803303403570/${id}`));
    }

    if (options?.clearFromCache === true) {
      fs.writeFileSync(this.snippetCache, JSON.stringify(this.cachedSnippets.filter(snippet => snippet.id !== messageId), null, 2));
    }
  }

  async toggleSnippet (messageId, enable) {
    if (typeof enable === 'undefined') {
      enable = !this.isEnabled(messageId);
    }

    if (enable === true) {
      const snippet = this.getSnippet(messageId);

      if (snippet) {
        const author = userStore.getUser(snippet.author) || await userProfileStore.getUser(snippet.author);
        if (!author) {
          throw new Error('Unable to fetch snippet author!');
        };

        this.main.moduleManager._applySnippet({
          author,
          id: messageId,
          content: `\`\`\`css\n${snippet.content}\n\`\`\``
        });

        const newSnippets = this.cachedSnippets.filter(snippet => snippet.id !== messageId);

        await fs.promises.writeFile(this.snippetCache, JSON.stringify(newSnippets, null, 2)).catch(e => {
          throw new Error('Unable to remove snippet from cache!', e);
        });
      } else {
        throw new Error(`Snippet '${messageId}' not found!`);
      }

      sendToast(snippet, 'Enabled', this.toggleSnippet);
    } else if (enable === false) {
      const snippets = this.getSnippets();

      if (snippets[messageId] && this.isEnabled(messageId)) {
        const snippet = snippets[messageId];
        const newSnippets = [ ...this.cachedSnippets, {
          id: messageId,
          author: snippet.author,
          content: snippet.content,
          timestamp: snippet.timestamp
        } ];

        await fs.promises.writeFile(this.snippetCache, JSON.stringify(newSnippets, null, 2)).catch(e => {
          throw new Error('Unable to add snippet to cache!', e);
        });

        this.removeSnippet(messageId);
      } else {
        throw new Error(`Snippet '${messageId}' not found!`);
      }

      sendToast(snippets[messageId], 'Disabled', this.toggleSnippet);
    }
  }
};
