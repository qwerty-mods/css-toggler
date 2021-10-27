const { React, FluxDispatcher, getModule, getModuleByDisplayName } = require('powercord/webpack');
const { TextAreaInput } = require('powercord/components/settings');

const { default: Button } = getModule(m => m.ButtonLink, false);
const { default: Avatar } = getModule([ 'AnimatedAvatar' ], false);

const { getDefaultAvatarURL } = getModule([ 'getDefaultAvatarURL' ], false);

const TextInput = getModuleByDisplayName('TextInput', false);
const parser = getModule([ 'parse', 'parseTopic' ], false);
const moment = getModule([ 'momentProperties' ], false);

const userStore = getModule([ 'getNullableCurrentUser' ], false);
const userProfileStore = getModule([ 'fetchProfile' ], false);

module.exports = React.memo(props => {
  const snippet = props.snippet;

  const [ title, setTitle ] = React.useState(props.title);
  const [ author, setAuthor ] = React.useState(userStore.getUser(snippet.author));
  const [ description, setDescription ] = React.useState(snippet.details?.description);
  const [ editing, setEditing ] = React.useState(false);

  React.useEffect(async () => {
    if (!author) {
      const author = await FluxDispatcher.wait(() => userProfileStore.getUser(snippet.author));

      setAuthor(author);
    }
  }, [ snippet.author ]);

  const handleOnEdit = React.useCallback(() => setEditing(!editing), [ editing ]);

  return (
    <div className='css-toggler-snippet-card' data-editing={editing}>
      <div className='card-header'>
        <div className='card-header-title'>
          <TextInput
            size='mini'
            maxLength={32}
            value={title}
            placeholder='Enter a title'
            className='card-header-title-input'
            inputClassName='card-header-title-input-box'
            onChange={setTitle}
            onBlur={() => (title === '' && setTitle('Untitled Snippet'), props.manager.updateSnippetDetails(snippet.id, { title }))}
          />
          <div className='card-header-title-placeholder'>
            {title}
          </div>
        </div>

        <div className='card-header-snippet-id'>
          ID: {snippet.id}{props.manager.getSnippet(snippet.id, true) ? ' (cached)' : ''}
        </div>
      </div>

      <div className='card-body'>
        {!editing && description && <div className='card-body-description'>
          {description}
        </div>}

        {editing && <div className='card-body-description'>
          <TextAreaInput
            maxLength={120}
            value={description}
            placeholder='How would you describe this snippet?'
            className='card-body-description-input-box'
            onChange={setDescription}
            onBlur={() => props.manager.updateSnippetDetails(snippet.id, { description })}
            autosize={true}
          />
        </div>}

        <div className='card-body-content'>
          {parser.reactParserFor(parser.defaultRules)(`\`\`\`css\n/* You applied this snippet ${moment(snippet.timestamp).fromNow()} */\n\n${snippet.content}\n\`\`\``)}
        </div>
      </div>

      <div className='card-footer'>
        <div className='card-footer-author'>
          <div className='card-footer-author-avatar'>
            <Avatar size={Avatar.Sizes.SIZE_32} src={author?.getAvatarURL() || getDefaultAvatarURL(snippet.author)}></Avatar>
          </div>
          <div className='card-footer-author-name'>
            {author?.tag}
          </div>
        </div>

        <div className='card-footer-actions'>
          <Button
            size={Button.Sizes.SMALL}
            look={Button.Looks[editing ? 'OUTLINED' : 'FILLED']}
            color={Button.Colors.GREEN} onClick={handleOnEdit}
          >
            {editing ? 'Close' : 'Edit'}
          </Button>
          <Button
            size={Button.Sizes.SMALL}
            color={Button.Colors.RED}
            onClick={() => {
              props.manager.removeSnippet(snippet.id, { clearFromCache: !props.manager.isEnabled(snippet.id), showToast: true });
              props.forceUpdate();
            }}
          >
            Remove
          </Button>
          <Button
            size={Button.Sizes.SMALL}
            color={Button.Colors.BRAND}
            onClick={async () => {
              await props.manager.toggleSnippet(snippet.id, !props.manager.isEnabled(snippet.id));
              props.forceUpdate();
            }}
          >
            {props.manager.isEnabled(snippet.id) ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </div>
    </div>
  );
});
