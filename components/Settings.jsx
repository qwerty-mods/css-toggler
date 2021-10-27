const { React } = require('powercord/webpack');

const SnippetCard = require('./SnippetCard');
module.exports = class Settings extends React.Component {
  constructor (props) {
    super(props);

    this.state = {};
    this.snippetManager = props.main.snippetManager;
  }

  render () {
    const { getSetting, toggleSetting, updateSetting } = this.props;

    const snippets = this.snippetManager.getSnippets(true);
    const cachedSnippets = global._.keyBy(snippets.cached, 'id');

    delete snippets.cached;

    const availableSnippets = { ...snippets, ...cachedSnippets };

    return (
      <div>
        {Object.keys(availableSnippets).map((id, index) => {
          const snippet = availableSnippets[id];
          snippet.id = id;

          return (
            <SnippetCard
              key={id}
              snippet={snippet}
              name={`Unnamed Snippet #${index + 1}`}
              description='This is a placeholder description.'
              manager={this.snippetManager}
            />
          );
        })}
      </div>
    )
  }
};