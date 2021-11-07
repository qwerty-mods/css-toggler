const { React, getModuleByDisplayName, getModule, i18n: { Messages } } = require("powercord/webpack");
const { Modal } = require("powercord/components/modal");
const { close: closeModal } = require("powercord/modal");
const { settings: {TextInput}, AsyncComponent, FormTitle, Button } = require("powercord/components");
const FormText = AsyncComponent.from(getModuleByDisplayName('FormText'));

const currentUser = getModule([ 'getUser', 'getCurrentUser' ], false).getCurrentUser();

module.exports = class SnippetCreator extends React.PureComponent {
  constructor(props) {
    super(props);

    console.log(props.main);

    this.state = {
      title: '',
      description: '',
      snippet: ''
    }
  }

  render() {
    return (
      <Modal className="powercord-text">
        <Modal.Header>
          <FormTitle tag="h4">CSS Snippet Creator</FormTitle>
        </Modal.Header>

        <Modal.Content>
            <TextInput
              value={this.state.title}
              onChange={(a) => this.setState({title: a})}
            >Name</TextInput>
            <TextInput
              value={this.state.description}
              onChange={(a) => this.setState({description: a})}
            >Description</TextInput>
            <TextInput
              value={this.state.snippet}
              required={true}
              onChange={(a) => this.setState({snippet: a})}
            >Snippet</TextInput>
            <FormText>
              Please note that this modal just makes it easier to add your own snippet with the correct format. It does not check if syntax is correct. CSS is only accepted for now.

              A title and description isn't needed, but will be helpful later on.
            </FormText>
        </Modal.Content>

        <Modal.Footer>
          <Button
            color={Button.Colors.GREEN}
            disabled={this.state.snippet == ""}
            onClick={() => {
              try {
              let css = '\n\n/**\n';
              const line1 = Messages.CSS_TOGGLER_SNIPPET_FORMAT_LINE1.format({ date: new Date() });
              const line2 = Messages.POWERCORD_SNIPPET_LINE2.format({
                authorTag: currentUser.tag,
                authorId: currentUser.id
              });
              
              css += ` * ${line1}\n * ${line2}\n * Snippet ID: 1\n */\n${this.state.snippet}\n/** 1 */\n`;

              console.log(css);

              this.props.main.moduleManager._saveQuickCSS(this.props.main.moduleManager._quickCSS + css);

              this.props.main.snippetManager.updateSnippetDetails("1", {title: this.state.title, description: this.state.description})
              
              closeModal();} catch (err) {console.log(err)}
            }}   
          >Save</Button>
          <Button
            color={Button.Colors.TRANSPARENT}
            look={Button.Looks.LINK}
            onClick={closeModal}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    )
  }
}