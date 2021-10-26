const { React } = require('powercord/webpack');
const { SwitchItem, TextInput, Category } = require('powercord/components/settings');

const SnippetCard = require('./SnippetCard');

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
        <SnippetCard
          name='Unnamed Snippet #1'
          id='851188997115478026'
          content={'.icon-27yU2q[src=\'https://cdn.discordapp.com/icons/538759280057122817/22db4d5a52d731f3b14729c079eac801.webp?size=128\'] {\ncontent: url(\'https://cdn.discordapp.com/avatars/518171798513254407/665fe74ee3fbf58b9d5949d7e15dbafa.webp?size=128\');\n}'}
          description='Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
        />
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