const { Flux, FluxDispatcher } = require('powercord/webpack');
const { FluxActions, CACHE_FOLDER } = require('../constants');
const { join } = require('path');

const importsCache = join(CACHE_FOLDER, 'imports.json');
const fs = require('fs');

if (!fs.existsSync(CACHE_FOLDER)) {
  fs.mkdirSync(CACHE_FOLDER);
}

if (!fs.existsSync(importsCache)) {
  fs.writeFileSync(importsCache, '[]');
}

let imports = [];
let cachedImports = JSON.parse(fs.readFileSync(importsCache, 'utf-8'));

/* Action Handlers */
function handleFetchImports (newImports) {
  const archivedImports = newImports.filter(url => cachedImports.find(cachedImport => cachedImport === url));
  archivedImports.forEach(url => handleEnableImport(url));

  imports = newImports;
}

function handleEnableImport (url) {
  cachedImports = cachedImports.filter(cachedImport => cachedImport !== url);

  try {
    fs.writeFileSync(importsCache, JSON.stringify(cachedImports, null, 2));
  } catch (e) {
    throw new Error(`Unable to remove import '${url}' from cache!`, e);
  }
}

function handleDisableImport (url) {
  cachedImports.push(url);

  try {
    fs.writeFileSync(importsCache, JSON.stringify(cachedImports, null, 2));
  } catch (e) {
    throw new Error(`Unable to add import '${url}' to cache!`, e);
  }
}

function handleRemoveImport (url, options) {
  if (!options?.preserveImport) {
    delete imports[imports.indexOf(url)];
  }

  if (cachedImports.find(cachedImport => cachedImport === url)) {
    handleEnableImport(url);
  }
}

const settings = powercord.api.settings._fluxProps('css-toggler');
const importDetails = settings.getSetting('importDetails', {});

/**
 * Import type definition
 * @typedef {Object} Import
 * @property {string} url - The URL of the import.
 * @property {Object} details - The details of the import.
 * @property {string} details.name - The name of the import.
 * @property {string} details.description - The description of the import.
 */

/**
 * Cached import type definition
 * @typedef {Object} CachedImport
 * @property {string} url - The URL of the import.
 */

class ImportStore extends Flux.Store {
  /**
   * Returns an existing import (i.e. cached or enabled) by its ID.
   * @param {string} id - The ID of the import to fetch.
   * @param {Object} options - Options for fetching an import.
   * @param {boolean} options.includeDetails - Whether to include the import's details.
   * @param {boolean} options.cachedOnly - Whether to only return a cached import.
   * @returns {Import|CachedImport|undefined} The import, if it exists.
   */
  getImport (url, options = {}) {
    const cachedOnly = Boolean(options?.cachedOnly);
    const cachedImport = cachedImports.find(cachedImport => cachedImport === url);

    let $import = cachedOnly ? cachedImport : imports[imports.indexOf(url)] || cachedImport;
    if ($import) {
      $import = cachedOnly ? $import : cachedImport || imports[imports.indexOf(url)];

      if (Boolean(options?.includeDetails)) {
        $import = {
          url: $import,
          details: importDetails[url]
        };
      }

      return $import;
    }
  }

  /**
   * Returns all imports that (optionally) meets a specific criteria.
   * @param {Object} options - Options for fetching imports.
   * @param {boolean} options.includeDetails - Whether to include the import's details.
   * @param {boolean} options.includeCached - Whether to include cached imports.
   * @param {boolean} options.cachedOnly - Whether to only return cached imports.
   */
  getImports (options) {
    let indexCounter = 0;
    const getIndexedTitle = () => ({ title: `Untitled Import #${++indexCounter}` });

    const _$cachedImports = cachedImports.reduce((cachedImports, $import) => {
      if (Boolean(options?.includeDetails)) {
        $import.details = importDetails[url] || getIndexedTitle();
      }

      return {
        ...cachedImports,
        [cachedImports.indexOf(url)]: $import
      };
    }, {});

    if (Boolean(options?.cachedOnly)) {
      return _$cachedImports;
    }

    const _$imports = { ...imports };

    if (Boolean(options?.includeDetails)) {
      Object.keys(_$imports).forEach(index => _$imports[index] = {
        url: _$imports[index],
        details: importDetails[_$imports[index]] || getIndexedTitle()
      });
    }

    if (Boolean(options?.includeCached)) {
      Object.assign(_$imports, { ..._$cachedImports });
    }

    return _$imports;
  }

  /**
   * Returns all imports stored within the cache.
   * @returns {CachedImport[]} An array of cached imports.
   */
  getCachedImports () {
    return cachedImports;
  }

  /**
   * Returns the total number of imports that (optionally) meets a specific criteria.
   * @param {Object} options - Options for calculating the total number of imports.
   * @param {boolean} options.includeCached - Whether to include cached imports in the result.
   * @param {boolean} options.cachedOnly - Whether to only return the number of cached imports.
   * @returns {number} The total number of imports.
   */
  getImportCount (options = { includeCached: true, cachedOnly: false }) {
    return (Boolean(options?.cachedOnly) ? 0 : imports.length) + (Boolean(options?.includeCached) ? cachedImports.length : 0);
  }

  /**
   * Returns if an import is enabled (not cached).
   * @param {string} url - The URL of the import to check for.
   * @returns {boolean} Whether the import is enabled.
   */
  isEnabled (url) {
    return !cachedImports.find(cachedImport => cachedImport === url);
  }
};

module.exports = new ImportStore(FluxDispatcher, {
  [FluxActions.IMPORTS_FETCH]: ({ imports }) => handleFetchImports(imports),
  [FluxActions.IMPORT_ENABLE]: ({ url }) => handleEnableImport(url),
  [FluxActions.IMPORT_DISABLE]: ({ url }) => handleDisableImport(url),
  [FluxActions.IMPORT_REMOVE]: ({ url, options }) => handleRemoveImport(url, options)
});
