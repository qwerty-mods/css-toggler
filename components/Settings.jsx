const { React } = require('powercord/webpack');

const SnippetCard = require('./SnippetCard');
let ConnectedSnippetCard;

module.exports = class Settings extends React.Component {
  constructor (props) {
    super(props);

    this.settings = props.main.settings;
    this.snippetManager = props.main.snippetManager;

    ConnectedSnippetCard = this.settings.connectStore(SnippetCard);
  }

  render () {
    const snippets = this.snippetManager.getSnippets({
      includeDetails: true,
      includeCached: true
    });

    return (
      <div>
        {Object.keys(snippets).map((id, index) => {
          const snippet = snippets[id];
          snippet.id = id;

          return (
            <ConnectedSnippetCard
              key={id}
              snippet={snippet}
              title={snippet.details?.title || `Untitled Snippet #${index + 1}`}
              forceUpdate={this.forceUpdate.bind(this)}
              manager={this.snippetManager}
            />
          );
        })}
      </div>
    )
  }
};