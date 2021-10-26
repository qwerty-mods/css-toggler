module.exports = {
  command: 'disable',
  description: 'Disable an existing snippet',
  executor: ([ id ], main) => main.snippetManager.toggleSnippet(id, false),
  autocomplete: (args, main) => {
    if (args.length > 1) {
      return false;
    }

    const snippets = main.snippetManager.getSnippets();

    return {
      commands: Object.keys(snippets).filter(id => id.includes(args[0])).map(id => ({
        command: id,
        description: snippets[id].content
      })),
      header: 'Available Snippets'
    };
  }
};
