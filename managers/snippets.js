const { getModule } = require('powercord/webpack');

const fs = require('fs');
const path = require('path');
const moment = getModule([ 'momentProperties' ], false);

const userStore = getModule([ 'getNullableCurrentUser' ], false);
const userProfileStore = getModule([ 'fetchProfile' ], false);

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

    return cachedSnippets;
  }

  _getSnippets () {
    const snippets = {};
    const snippetMatches = this.main.moduleManager._quickCSS.matchAll(/(\/[*]{2}[^]+?Snippet ID: \d+\n \*\/)\n([^]+?)\n(\/[*]{2} \d+ \*\/)/g);

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
    let quickCSS = this.main.moduleManager._quickCSS;
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

      this.main.moduleManager._saveQuickCSS(quickCSS);
    }
  }

  async _toggleSnippet (messageId, enable) {
    if (enable) {
      const snippet = this.cachedSnippets.find(snippet => snippet.id === messageId);

      if (snippet) {
        const author = userStore.getUser(snippet.author) || await userProfileStore.getUser(snippet.author);

        this.main.moduleManager._applySnippet({
          author,
          id: messageId,
          content: `\`\`\`css\n${snippet.content}\n\`\`\``
        });

        const newSnippets = this.cachedSnippets.filter(snippet => snippet.id !== messageId);

        fs.promises.writeFile(this.snippetsCache, JSON.stringify(newSnippets, null, 2));
      }
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
};
