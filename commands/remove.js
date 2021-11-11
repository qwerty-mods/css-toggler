const { CommandResultColors } = require('../constants');

module.exports = {
  command: 'remove',
  description: 'Remove an existing snippet',
  executor: ([ id ], main) => {
    let error;

    if (!id) {
      error = 'You must specify a message ID!'
    } else {
      main.snippetManager.removeSnippet(id).catch(e => {
        main.error(e);

        error = e.message;
      });
    }

    return {
      send: false,
      result: {
        type: 'rich',
        color: error ? CommandResultColors.ERROR : CommandResultColors.SUCCESS,
        description: error || `Successfully removed snippet '${id}'!`
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
