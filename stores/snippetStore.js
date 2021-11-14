const { Flux, FluxDispatcher } = require('powercord/webpack');
const { FluxActions, CACHE_FOLDER, MAX_CUSTOM_SNIPPET_ID_RANGE } = require('../constants');
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
    ...(({ author, channel, content, timestamp }) => ({ author, channel, content, timestamp }))(snippets[id])
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

  if (cachedSnippets.find(cachedSnippet => cachedSnippet.id === id)) {
    handleEnableSnippet(id);
  }
}

const settings = powercord.api.settings._fluxProps('css-toggler');
const snippetDetails = settings.getSetting('snippetDetails', {});

/**
 * Snippet type definition
 * @typedef {Object} Snippet
 * @property {string} id - The ID of the snippet.
 * @property {string|undefined} channel - The ID of the channel the snippet was submitted in.
 * @property {string} author - The author of the snippet.
 * @property {string} content - The content of the snippet.
 * @property {number} timestamp - The timestamp of the snippet.
 * @property {Object} details - The details of the snippet.
 * @property {string} details.name - The name of the snippet.
 * @property {string} details.description - The description of the snippet.
 */

/**
 * Cached snippet type definition
 * @typedef {Object} CachedSnippet
 * @property {string} id - The ID of the snippet.
 * @property {string?} channel - The ID of the channel the snippet was submitted in.
 * @property {string} author - The author of the snippet.
 * @property {string} content - The content of the snippet.
 * @property {number} timestamp - The timestamp of the snippet.
 */

class SnippetStore extends Flux.Store {
  /**
   * Returns an existing snippet (i.e. cached or enabled) by its ID.
   * @param {string} id - The ID of the snippet to fetch.
   * @param {Object} options - Options for fetching a snippet.
   * @param {boolean} options.includeDetails - Whether to include the snippet's details.
   * @param {boolean} options.cachedOnly - Whether to only return a cached snippet.
   * @returns {Snippet|CachedSnippet|undefined} The snippet, if it exists.
   */
  getSnippet (id, options = {}) {
    const cachedOnly = Boolean(options?.cachedOnly);
    const cachedSnippet = cachedSnippets.find(cachedSnippet => cachedSnippet.id === id);

    let snippet = cachedOnly ? cachedSnippet : snippets[id] || cachedSnippet;
    if (snippet) {
      snippet = cachedOnly ? snippet : cachedSnippet || { id, ...snippets[id] };
      snippet.custom = this.isCustom(id);

      if (Boolean(options?.includeDetails)) {
        snippet.details = snippetDetails[id];
      }

      return snippet;
    }
  }

  /**
   * Returns all snippets that (optionally) meets a specific criteria.
   * @param {Object} options - Options for fetching snippets.
   * @param {boolean} options.includeDetails - Whether to include the snippet's details.
   * @param {boolean} options.includeCached - Whether to include cached snippets.
   * @param {boolean} options.cachedOnly - Whether to only return cached snippets.
   */
  getSnippets (options) {
    let indexCounter = 0;
    const getIndexedTitle = () => ({ title: `Untitled Snippet #${++indexCounter}` });

    const _$cachedSnippets = cachedSnippets.reduce((cachedSnippets, snippet) => {
      if (Boolean(options?.includeDetails)) {
        snippet.details = snippetDetails[snippet.id] || getIndexedTitle();
      }

      return {
        ...cachedSnippets,
        [snippet.id]: snippet
      };
    }, {});

    if (Boolean(options?.cachedOnly)) {
      return _$cachedSnippets;
    }

    const _$snippets = { ...snippets };

    if (Boolean(options?.includeDetails)) {
      Object.keys(_$snippets).forEach(id => _$snippets[id].details = snippetDetails[id] || getIndexedTitle());
    }

    if (Boolean(options?.includeCached)) {
      Object.assign(_$snippets, { ..._$cachedSnippets });
    }

    return _$snippets;
  }

  /**
   * Returns all snippets stored within the cache.
   * @returns {CachedSnippet[]} An array of cached snippets.
   */
  getCachedSnippets () {
    return cachedSnippets;
  }

  /**
   * Returns the total number of snippets that (optionally) meets a specific criteria.
   * @param {Object} options - Options for calculating the total number of snippets.
   * @param {boolean} options.includeCached - Whether to include cached snippets in the result.
   * @param {boolean} options.cachedOnly - Whether to only return the number of cached snippets.
   * @returns {number} The total number of snippets.
   */
  getSnippetCount (options = { includeCached: true, cachedOnly: false }) {
    return (Boolean(options?.cachedOnly) ? 0 : Object.keys(snippets).length) + (Boolean(options?.includeCached) ? cachedSnippets.length : 0);
  }

  /**
   * Returns if a snippet is custom (created by the current user).
   * @param {string} id - The ID of the snippet to check for.
   * @returns {boolean} Whether the snippet is custom.
   */
  isCustom (id) {
    return parseInt(id) < MAX_CUSTOM_SNIPPET_ID_RANGE;
  }

  /**
   * Returns if a snippet is enabled (not cached).
   * @param {string} id - The ID of the snippet to check for.
   * @returns {boolean} Whether the snippet is enabled.
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
