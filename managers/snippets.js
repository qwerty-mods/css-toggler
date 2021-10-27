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
            text: status === "Enabled" ? "Disable" : status === "Disabled" ? "Enable" : "Jump to Message",
            look: 'ghost',
            size: 'small',
            onClick: () => {
                callback(snippet.id, status === "Enabled");

                powercord.api.notices.closeToast('status-changed');
            }
        }
    ]
  })
}

module.exports = class SnippetManager {
  constructor (main) {
    this.main = main;
    this.cacheFolder = path.join(__dirname, '..', '.cache');
    this.snippetsCache = path.join(this.cacheFolder, 'snippets.json');
  }

  get cachedSnippets () {
    if (!fs.existsSync(this.cacheFolder)) {
      fs.mkdirSync(this.cacheFolder);
    }

    if (!fs.existsSync(this.snippetsCache)) {
      fs.writeFileSync(this.snippetsCache, '[]');
    }

    const cachedSnippets = JSON.parse(fs.readFileSync(this.snippetsCache, 'utf8'));
    // console.log(cachedSnippets)
    return cachedSnippets;
  }

  isEnabled (messageId) {
    return this.cachedSnippets.find(snippet => snippet.id === messageId) !== null;
  }

  getSnippet (messageId) {
    const snippets = this.getSnippets()
    if (snippets[messageId]) {
      let snippet = snippets[messageId];
      snippet.id = messageId;
      return snippet
    }
    return this.cachedSnippets.find(snippet => snippet.id === messageId);
  }

  getSnippets (includeCached = false) {
    const snippets = {};
    const snippetMatches = this.main.moduleManager._quickCSS.matchAll(/(\/[*]{2}[^]+?Snippet ID: \d+\n \*\/)\n([^]+?)\n(\/[*]{2} \d+ \*\/)/g);

    for (const snippet of snippetMatches) {
      const [ _, header, content, footer ] = snippet;

      if (!content.includes('Snippet ID:')) {
        const id = header.match(/Snippet ID: (\d+)/)[1];
        const appliedString = header.match(/(\w+ \d+, \d{4}(.+ )?\d+:\d+:\d+ \w+)|(\d+ \w+ \d+(.+ )?\d+:\d+:\d+)/)[0];
        const appliedTimestamp = moment(appliedString, 'DD MMM YYYY HH:mm:ss').valueOf();
        const author = header.match(/#\d{4} \((\d{16,20})\)/)[1];

        snippets[id] = { header, content, footer, author, timestamp: appliedTimestamp };
      }
    }

    if (includeCached === true) {
      snippets.cached = this.cachedSnippets;
      console.log(this.cachedSnippets)
      console.log(snippets.cached);
    }

    return snippets;
  }

  removeSnippet (messageId, message=false) {
    let snippet = this.getSnippets()[messageId]; // For toast
    snippet.id = messageId;

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

    if (message) sendToast(snippet, "Removed", (id, f) => transitionTo(`/channels/538759280057122817/755005803303403570/${id}`));
  }

  async toggleSnippet (messageId, enable) {
    if (typeof enable === 'undefined') {
      enable = this.isEnabled(messageId);
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

        await fs.promises.writeFile(this.snippetsCache, JSON.stringify(newSnippets, null, 2)).catch(e => {
          throw new Error('Unable to remove snippet from cache!', e);
        });
      } else {
        throw new Error(`Snippet '${messageId}' not found!`);
      }

      sendToast(snippet, "Enabled", this.toggleSnippet);
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

        await fs.promises.writeFile(this.snippetsCache, JSON.stringify(newSnippets, null, 2)).catch(e => {
          throw new Error('Unable to add snippet to cache!', e);
        });

        this.removeSnippet(messageId);
      } else {
        throw new Error(`Snippet '${messageId}' not found!`);
      }

      sendToast(snippets[messageId], "Disabled", this.toggleSnippet);
    }
  }
};
