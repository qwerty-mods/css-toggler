module.exports = {
  command: 'disable',
  description: 'Disable an existing snippet',
  executor: async ([ id ], main) => {
    let error;

    if (!id) {
      error = 'You must specify a message ID!'
    } else {
      await main.snippetManager.disableSnippet(id, false).catch(e => {
        main.error(e);

        error = e.message;
      });
    }

    return {
      send: false,
      result: {
        type: 'rich',
        color: error ? 0xED4245 : 0x3BA55C,
        description: error || `Successfully disabled snippet '${id}'!`
      }
    }
  },
  autocomplete: (args, main) => {
    if (args.length > 1) {
      return false;
    }

    const snippets = main.snippetManager.getSnippets({ includeDetails: true });

    return {
      commands: Object.keys(snippets).filter(id => id.includes(args[0])).map(id => ({
        command: id,
        description: snippets[id].details?.title || snippets[id].content
      })),
      header: 'Available Snippets'
    };
  }
};
