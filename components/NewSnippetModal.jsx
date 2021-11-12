const { React, getModule, i18n: { Messages } } = require('powercord/webpack');
const { Button, Text, settings: { TextAreaInput, TextInput } } = require('powercord/components');
const { close: closeModal } = require('powercord/modal');

const Modal = getModule([ 'ModalRoot' ], false);
const Header = getModule(m => m?.displayName === 'Header' && m?.Sizes, false);

const { default: HelpMessage, HelpMessageTypes } = getModule([ 'HelpMessageTypes' ], false);
const { MAX_SNIPPET_TITLE_LENGTH, MAX_SNIPPET_DESCRIPTION_LENGTH } = require('../constants');

module.exports = class SnippetCreator extends React.PureComponent {
  constructor (props) {
    super(props);

    this.currentUser = getModule([ 'getUser', 'getCurrentUser' ], false).getCurrentUser();
    this.state = {
      title: '',
      description: '',
      snippet: ''
    };
  }

  render () {
    return (
      <Modal.ModalRoot className='css-toggler-new-snippet-modal' transitionState={1}>
        <Modal.ModalHeader>
          <Header tag='h2' size={Header.Sizes.SIZE_20}>CSS Snippet Creator</Header>
        </Modal.ModalHeader>

        <Modal.ModalContent className='modal-content'>
            <TextInput
              value={this.state.title}
              maxLength={MAX_SNIPPET_TITLE_LENGTH}
              onChange={(value) => this.setState({ title: value })}
            >
              Name
            </TextInput>
            <TextAreaInput
              value={this.state.description}
              maxLength={MAX_SNIPPET_DESCRIPTION_LENGTH}
              onChange={(value) => this.setState({ description: value })}
              autosize={true}
            >
              {Messages.DESCRIPTION}
            </TextAreaInput>
            <TextAreaInput
              value={this.state.snippet}
              onChange={(value) => this.setState({ snippet: value, snippetError: value !== '' && '' })}
              error={this.state.snippetError}
              required={true}
              autosize={true}
            >
              Snippet
            </TextAreaInput>
            {this.state.error && <HelpMessage messageType={HelpMessageTypes.ERROR}>
              An error has occurred while creating this snippet: {this.state.error}.<br/><br/>
              Please contact {this.props.main.manifest.author.split(', ').map((author, index) => `${index > 0 ? ' or ' : ''}"${author}"`).join(' ')} if this error persists!
            </HelpMessage>}
            {!this.state.error && <Text>
              Please note that this modal just makes it easier to add your own snippet with the correct format. It does not check if syntax is correct. CSS is only accepted for now.

              A title and description isn't needed, but will be helpful later on.
            </Text>}
        </Modal.ModalContent>

        <Modal.ModalFooter>
          <Button
            color={Button.Colors.GREEN}
            onClick={() => {
              // Validation
              if (this.state.snippet === '') {
                this.setState({ snippetError: 'You must enter a snippet.' });

                return;
              }

              // Attempt to create custom snippet
              try {
                let customId = 1;
                while (this.props.main.snippetStore.getSnippet(customId.toString()) != undefined) {
                  customId++;
                }

                this.props.main.snippetManager.addSnippet({
                  id: customId.toString(),
                  content: this.state.snippet,
                  author: {
                    tag: this.currentUser.tag,
                    id: this.currentUser.id
                  }
                });

                this.props.main.snippetManager.updateSnippetDetails(customId.toString(), {
                  title: this.state.title,
                  description: this.state.description
                });

                closeModal();
              } catch (err) {
                this.setState({ error: err.message });
              }
            }}
          >
            {Messages.SUBMIT}
          </Button>
          <Button
            color={Button.Colors.TRANSPARENT}
            look={Button.Looks.LINK}
            onClick={closeModal}
          >
            {Messages.CANCEL}
          </Button>
        </Modal.ModalFooter>
      </Modal.ModalRoot>
    );
  }
}
