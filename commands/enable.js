module.exports = {
  command: 'enable',
  description: 'Enable an existing snippet',
  executor: async ([ id ], main) => {
    let error;

    if (!id) {
      error = 'You must specify a message ID!'
    } else {
      await main.snippetManager.enableSnippet(id).catch(e => {
        main.error(e);

        error = e.message;
      });
    }

    return {
      send: false,
      result: {
        type: 'rich',
        color: error ? 0xED4245 : 0x3BA55C,
        description: error || `Successfully enabled snippet '${id}'!`
      }
    }
  },
  autocomplete: (args, main) => {
    if (args.length > 1) {
      return false;
    }

    const cachedSnippets = main.snippetManager.cachedSnippets;
    if (cachedSnippets.length === 0) {
      return false;
    }

    const snippetDetails = main.settings.get('snippetDetails', {});

    return {
      commands: cachedSnippets.filter(snippet => snippet.id.includes(args[0])).map(snippet => ({
        command: snippet.id,
        description: snippetDetails[snippet.id]?.title || snippet.content
      })),
      header: 'Available Snippets'
    };
  }
};
