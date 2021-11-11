const { CommandResultColors } = require('../constants');

module.exports = {
  command: 'disable',
  description: 'Disable an existing snippet',
  executor: async ([ id ], main) => {
    let error;

    if (!id) {
      error = 'You must specify a message ID!'
    } else {
      await main.snippetManager.disableSnippet(id).catch(e => {
        main.error(e);

        error = e.message;
      });
    }

    return {
      send: false,
      result: {
        type: 'rich',
        color: error ? CommandResultColors.ERROR : CommandResultColors.SUCCESS,
        description: error || `Successfully disabled snippet '${id}'!`
      }
    }
  },
  autocomplete: (args, main) => {
    if (args.length > 1) {
      return false;
    }

    const snippets = main.snippetStore.getSnippets({ includeDetails: true });
    const snippetIds = Object.keys(snippets);

    return {
      commands: snippetIds.filter(id => id.includes(args[0])).map(id => ({
        command: id,
        description: snippets[id].details.title
      })),
      header: `Available Snippets (${snippetIds.length})`
    };
  }
};
