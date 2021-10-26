module.exports = {
  command: 'remove',
  description: 'Remove an existing snippet',
  executor: ([ id ], main) => main.snippetManager._removeSnippet(id),
  autocomplete: (args, main) => {
    if (args.length > 1) {
      return false;
    }

    const snippets = main.snippetManager._getSnippets();

    return {
      commands: Object.keys(snippets).filter(id => id.includes(args[0])).map(id => ({
        command: id,
        description: snippets[id].content
      })),
      header: 'Available Snippets'
    };
  }
};
