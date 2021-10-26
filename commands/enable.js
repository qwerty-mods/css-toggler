module.exports = {
  command: 'enable',
  description: 'Enable an existing snippet',
  executor: ([ id ], main) => main.snippetManager.toggleSnippet(id, true),
  autocomplete: (args, main) => {
    if (args.length > 1) {
      return false;
    }

    const cachedSnippets = main.snippetManager.cachedSnippets;
    if (cachedSnippets.length === 0) {
      return false;
    }

    return {
      commands: cachedSnippets.filter(snippet => snippet.id.includes(args[0])).map(snippet => ({
        command: snippet.id,
        description: snippet.content
      })),
      header: 'Available Snippets'
    };
  }
};
