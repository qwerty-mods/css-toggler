const { React } = require('powercord/webpack');
const { SwitchItem, TextInput, Category } = require('powercord/components/settings');

let snippetManager;

class SnippetBox extends React.Component {
  constructor () {
    super();

    this.state = {
      opened: false
    };
  }

  render () {
    return (
      <Category
        name={this.props.name}
        description={this.props.description}
        opened={this.state.opened}
        onChange={() => {
            this.setState({ opened: !this.state.opened })
        }}
      >
        <TextInput
          value={this.props.name}
          onChange={this.props.nameChange}
        >Name of Snippet</TextInput>

        <TextInput
          value={this.props.description}
          onChange={this.props.descriptionChange}
        >Description</TextInput>

        <SwitchItem
          onChange={() => {
            snippetManager.toggleSnippet(this.props.id, !this.props.enabled);
            this.props.enabled = !this.props.enabled;
          }}
          value={this.props.enabled}
        >Enabled?</SwitchItem>
      </Category>
    )
  }
}

module.exports = class Settings extends React.Component {
  constructor (props) {
    super(props);

    this.state = {};

    snippetManager = props.main.snippetManager;
  }

  render () {
    const { getSetting, toggleSetting, updateSetting } = this.props;
    return (
      <div>
        <SnippetBox
          name='Hi'
          description='No'
          enabled={false}
        >
        </SnippetBox>
      </div>
    )
  }
};