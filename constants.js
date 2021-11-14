const { join } = require('path');

module.exports = Object.freeze({
  FluxActions: {
    SNIPPETS_FETCH: 'SNIPPETS_FETCH',
    SNIPPET_ENABLE: 'SNIPPET_ENABLE',
    SNIPPET_DISABLE: 'SNIPPET_DISABLE',
    SNIPPET_REMOVE: 'SNIPPET_REMOVE'
  },
  CommandResultColors: {
    ERROR: 0xED4245,
    SUCCESS: 0x3BA55C
  },
  CACHE_FOLDER: join(__dirname, '.cache'),
  MAX_SNIPPET_TITLE_LENGTH: 32,
  MAX_SNIPPET_DESCRIPTION_LENGTH: 120,
  MAX_CUSTOM_SNIPPET_ID_RANGE: 4194304,
  DEFAULT_SNIPPET_TITLE: 'Untitled Snippet'
});
