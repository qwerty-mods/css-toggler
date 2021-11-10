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

/**
 * Snippet type definition
 * @typedef {Object} Snippet
 * @property {string} id - The ID of the snippet.
 * @property {string} author - The author of the snippet.
 * @property {string} content - The content of the snippet.
 * @property {number} timestamp - The timestamp of the snippet.
 * @property {Object} details - The details of the snippet.
 * @property {string} details.name - The name of the snippet.
 * @property {string} details.description - The description of the snippet.
 */

class SnippetStore extends Flux.Store {
  /**
   * Returns an existing snippet (i.e. cached or enabled) by its ID.
   * @param {string} id - The ID of the snippet to fetch.
   * @param {Object} options - Options for fetching a snippet.
   * @param {boolean} options.includeDetails - Whether to include the snippet's details.
   * @param {boolean} options.cachedOnly - Whether to only return a cached snippet.
   */

  getSnippet (id, options) {
    if (!options?.cachedOnly && snippets[id]) {
      const snippet = { id, ...snippets[id] };

      if (options?.includeDetails === true) {
        snippet.details = snippetDetails[id];
      }

      return snippet;
    }

    const snippet = cachedSnippets.find(snippet => snippet.id === id);

    if (snippet && options?.includeDetails === true) {
      snippet.details = snippetDetails[id];
    }

    return snippet;
  }

  /**
   * Returns all snippets following the specified criteria.
   * @param {Object} options - Options for fetching snippets.
   * @param {boolean} options.includeDetails - Whether to include the snippet's details.
   * @param {boolean} options.includeCached - Whether to include cached snippets.
   * @param {boolean} options.cachedOnly - Whether to only return cached snippets.
   */
  getSnippets (options) {
    let indexCounter = 0;

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

    const _$snippets = { ...snippets };

    if (options?.includeDetails === true) {
      Object.keys(_$snippets).forEach(id => _$snippets[id].details = snippetDetails[id] || (indexCounter += 1, { title: `Untitled Snippet #${indexCounter}` }));
    }

    if (options?.includeCached === true) {
      Object.assign(_$snippets, { ..._$cachedSnippets });
    }

    return _$snippets;
  }

  /**
   * Returns all snippets stored within the cache.
   */
  getCachedSnippets () {
    return cachedSnippets;
  }

  /**
   * Checks if a snippet is cached (enabled or disabled).
   * @param {string} id - The ID of the snippet to check.
   * @returns {boolean} Whether the snippet is cached.
   */
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
