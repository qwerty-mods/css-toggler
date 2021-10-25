const { React, i18n: { Messages } } = require('powercord/webpack');
const { Clickable } = require('powercord/components');

const SnippetButton = React.memo(props => {
  const isExistingSnippet = props.moduleManager._quickCSS.includes(`Snippet ID: ${props.message.id}`);
  const [ applied, setApplied ] = React.useState(isExistingSnippet);

  return (
    <div className='powercord-snippet-apply'>
      <Clickable onClick={() => {
        applied ? props.main._removeSnippet(props.message.id) : props.moduleManager._applySnippet(props.message);

        setApplied(!applied);
      }}>
        {applied ? Messages.CSS_TOGGLER_SNIPPET_REMOVE : Messages.POWERCORD_SNIPPET_APPLY}
      </Clickable>
    </div>
  );
});

SnippetButton.displayName = 'SnippetButton';

module.exports = SnippetButton;
