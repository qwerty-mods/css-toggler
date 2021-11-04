const { Flux, FluxDispatcher } = require('powercord/webpack');
const { FluxActions, CACHE_FOLDER } = require('../constants');
const { join } = require('path');

const snippetsCache = join(CACHE_FOLDER, 'snippets.json');
const fs = require('fs');

if (!fs.existsSync(CACHE_FOLDER)) {
  fs.mkdirSync(CACHE_FOLDER);
}

if (!fs.existsSync(snippetsCache)) {
  fs.writeFileSync(snippetsCache, '[]');
}

let snippets = {};
let cachedSnippets = JSON.parse(fs.readFileSync(snippetsCache, 'utf-8'));

/* Action Handlers */
function handleFetchSnippets (newSnippets) {
  const archivedSnippets = Object.keys(newSnippets).filter(id => cachedSnippets.find(cachedSnippet => cachedSnippet.id === id));
  archivedSnippets.forEach(id => handleEnableSnippet(id));

  snippets = newSnippets;
}

function handleEnableSnippet (id) {
  cachedSnippets = cachedSnippets.filter(cachedSnippet => cachedSnippet.id !== id);

  try {
    fs.writeFileSync(snippetsCache, JSON.stringify(cachedSnippets, null, 2));
  } catch (e) {
    throw new Error(`Unable to remove snippet '${id}' from cache!`, e);
  }
}

function handleDisableSnippet (id) {
  const snippet = {
    id,
    ...(({ author, content, timestamp }) => ({ author, content, timestamp }))(snippets[id])
  };

  cachedSnippets.push(snippet);

  try {
    fs.writeFileSync(snippetsCache, JSON.stringify(cachedSnippets, null, 2));
  } catch (e) {
    throw new Error(`Unable to add snippet '${id}' to cache!`, e);
  }
}

function handleRemoveSnippet (id, options) {
  if (!options?.preserveSnippet) {
    delete snippets[id];
  }

  if (!cachedSnippets.find(cachedSnippet => cachedSnippet.id === id)) {
    handleEnableSnippet(id);
  }
}

const settings = powercord.api.settings._fluxProps('css-toggler');
const snippetDetails = settings.getSetting('snippetDetails', {});

class SnippetStore extends Flux.Store {
  getSnippet (id, cachedOnly = false) {
    if (!cachedOnly && snippets[id]) {
      const snippet = snippets[id];

      return { id, ...snippet };
    }

    return cachedSnippets.find(snippet => snippet.id === id);
  }

  getSnippets (options) {
    let indexCounter = 0;
    const _$snippets = { ...snippets };

    if (options?.includeDetails === true) {
      for (const id in _$snippets) {
        _$snippets[id] = {
          ..._$snippets[id],
          details: snippetDetails[id] || (indexCounter += 1, { title: `Untitled Snippet #${indexCounter}` })
        };
      }
    }

    const _$cachedSnippets = cachedSnippets.reduce((cachedSnippets, snippet) => {
      if (options?.includeDetails === true) {
        snippet.details = snippetDetails[snippet.id] || (indexCounter += 1, { title: `Untitled Snippet #${indexCounter}` });
      }

      return {
        ...cachedSnippets,
        [snippet.id]: snippet
      };
    }, {});

    if (options?.cachedOnly === true) {
      return _$cachedSnippets;
    }

    if (options?.includeCached === true) {
      Object.assign(_$snippets, { ..._$cachedSnippets });
    }

    return _$snippets;
  }

  getCachedSnippets () {
    return cachedSnippets;
  }

  isEnabled (id) {
    return !cachedSnippets.find(cachedSnippet => cachedSnippet.id === id);
  }
};

module.exports = new SnippetStore(FluxDispatcher, {
  [FluxActions.SNIPPETS_FETCH]: ({ snippets }) => handleFetchSnippets(snippets),
  [FluxActions.SNIPPET_ENABLE]: ({ id }) => handleEnableSnippet(id),
  [FluxActions.SNIPPET_DISABLE]: ({ id }) => handleDisableSnippet(id),
  [FluxActions.SNIPPET_REMOVE]: ({ id, options }) => handleRemoveSnippet(id, options)
});
