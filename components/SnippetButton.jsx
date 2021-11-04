const { React, i18n: { Messages } } = require('powercord/webpack');
const { Clickable } = require('powercord/components');

const SnippetButton = React.memo(props => {
  const [ applied, setApplied ] = React.useState(props.applied);

  const callback = React.useCallback(() => setApplied(!applied), [ applied ]);

  return (
    <div className='powercord-snippet-apply'>
      <Clickable onClick={() => {
        try {
          if (props.applied) {
            props.main.snippetManager.removeSnippet(props.message.id);
          } else {
            props.main.snippetManager.addSnippet(props.message);
          }
        } catch (e) {
          props.main.error(e);
        }

        callback();
      }}>
        {props.applied ? Messages.CSS_TOGGLER_SNIPPET_REMOVE : Messages.POWERCORD_SNIPPET_APPLY}
      </Clickable>
    </div>
  );
});

SnippetButton.displayName = 'SnippetButton';

module.exports = SnippetButton;
