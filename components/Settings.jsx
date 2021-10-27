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

    let snippets = this.snippetManager.getSnippets(true);
    let cached = snippets.cached;
    delete snippets.cached;

    console.log(cached)

    snippets = {...snippets, ...cached};
    console.log(snippets);

    return (
      <div>
        {Object.keys(snippets).map((id, index) => {
          const snippet = snippets[id];
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