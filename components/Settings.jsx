const { React } = require('powercord/webpack');

const SnippetCard = require('./SnippetCard');
module.exports = class Settings extends React.Component {
  constructor (props) {
    super(props);

    this.state = {};
    this.settings = props.main.settings;
    this.snippetManager = props.main.snippetManager;
    this.connectedSnippetCard = this.settings.connectStore(SnippetCard);
  }

  render () {
    const { getSetting, toggleSetting, updateSetting } = this.props;

    const ConnectedSnippetCard = this.connectedSnippetCard;

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
              title={snippet.details?.title || `Unnamed Snippet #${index + 1}`}
              manager={this.snippetManager}
            />
          );
        })}
      </div>
    )
  }
};