const { React, FluxDispatcher, getModule, getModuleByDisplayName, i18n: { Messages } } = require('powercord/webpack');
const { TextAreaInput } = require('powercord/components/settings');
const { Tooltip, Clickable } = require('powercord/components');

const { getDefaultAvatarURL } = getModule([ 'getDefaultAvatarURL' ], false);
const { openUserProfileModal } = getModule([ 'openUserProfileModal' ], false);

const { default: Button } = getModule([ 'ButtonLink' ], false);
const { default: Avatar } = getModule([ 'AnimatedAvatar' ], false);

const Caret = getModuleByDisplayName('Caret', false);
const TextInput = getModuleByDisplayName('TextInput', false);

const parser = getModule([ 'parse', 'parseTopic' ], false);
const userStore = getModule([ 'getNullableCurrentUser' ], false);
const userProfileStore = getModule([ 'fetchProfile' ], false);

const CodeMirrorEditor = require('./CodeMirrorEditor');

const { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH, DEFAULT_SNIPPET_TITLE } = require('../constants');

module.exports = React.memo(props => {
  const snippet = props.snippet;

  if (!snippet) {
    return null;
  }

  const isNewCustomSnippet = snippet.content === '/* Please replace me with your desired snippet */';
  const defaultTitle = isNewCustomSnippet ? 'New Custom Snippet' : `${DEFAULT_SNIPPET_TITLE} #${props.index}`;

  const [ title, setTitle ] = React.useState(snippet.details?.title || defaultTitle);
  const [ author, setAuthor ] = React.useState(userStore.getUser(snippet.author));
  const [ description, setDescription ] = React.useState(snippet.details?.description);
  const [ expanded, setExpanded ] = React.useState(props.expanded);
  const [ editing, setEditing ] = React.useState(isNewCustomSnippet);

  React.useEffect(async () => {
    if (!author) {
      const author = await FluxDispatcher.wait(() => userProfileStore.getUser(snippet.author));

      setAuthor(author);
    }
  }, [ snippet.author ]);

  const handleOnEdit = React.useCallback(() => setEditing(!editing), [ editing ]);
  const handleOnTitleBlur = React.useCallback(() => {
    const titleTrimmed = title.trim();
    setTitle(titleTrimmed);

    const isEmptyOrDefault = titleTrimmed === '' || titleTrimmed.startsWith(DEFAULT_SNIPPET_TITLE);
    if (isEmptyOrDefault) {
      setTitle(titleTrimmed === '' ? defaultTitle : titleTrimmed);
    }

    props.manager.updateSnippetDetails(snippet.id, { title: isEmptyOrDefault ? '' : titleTrimmed });
  }, [ title ]);

  const handleOnAuthorClick = () => openUserProfileModal({ userId: snippet.author });
  const handleOnExpand = React.useCallback(() => {
    setExpanded(!expanded);
    setEditing(false);

    props.manager.toggleCollapse(snippet.id);
  }, [ expanded ]);

  return (
    <div className='css-toggler-snippet-card' data-key={snippet.id} data-editing={editing} data-expanded={expanded} data-hasdescription={Boolean(description)}>
      <div className='card-header'>
        <div className='card-header-title'>
          <TextInput
            size='mini'
            maxLength={MAX_TITLE_LENGTH}
            value={title.startsWith(DEFAULT_SNIPPET_TITLE) ? '' : title}
            placeholder={title.startsWith(DEFAULT_SNIPPET_TITLE) ? '' : Messages.CSS_TOGGLER_TITLE_PLACEHOLDER}
            className='card-header-title-input'
            inputClassName='card-header-title-input-box'
            onChange={(value) => setTitle(value.startsWith(DEFAULT_SNIPPET_TITLE) ? title : value)}
            onBlur={handleOnTitleBlur}
          />
          <div className='card-header-title-placeholder'>
            {title}
          </div>
        </div>

        <div className='card-header-snippet-id'>
          {!snippet.custom && <>
            ID:&nbsp;
            <Tooltip text={Messages.CSS_TOGGLER_JUMP_TO_SNIPPET_TOOLTIP}>
              <Clickable className='jump-to-snippet' onClick={() => props.manager.jumpToSnippet(snippet.id, snippet.channel)}>
                {snippet.id}&nbsp;
              </Clickable>
            </Tooltip>
          </>}
          {snippet.custom && 'Custom Snippet'}&nbsp;
          {!props.enabled && '(cached)'}
        </div>

        <Clickable onClick={handleOnExpand}>
          <Caret className='card-header-expand-icon' expanded={expanded} aria-hidden={true} />
        </Clickable>
      </div>

      <div className='card-body'>
        {!editing && description && <div className='card-body-description'>
          {description}
        </div>}

        {editing && <div className='card-body-description'>
          <TextAreaInput
            maxLength={MAX_DESCRIPTION_LENGTH}
            value={description}
            placeholder={Messages.CSS_TOGGLER_SNIPPET_DESC_PLACEHOLDER}
            className='card-body-description-input-box'
            onChange={setDescription}
            onBlur={() => props.manager.updateSnippetDetails(snippet.id, { description })}
            autosize={true}
          />
        </div>}

        {(!props.enabled || !editing) && expanded && <div className='card-body-content'>
          {parser.reactParserFor(parser.defaultRules)(
            `\`\`\`css\n/* ${Messages.CSS_TOGGLER_SNIPPET_APPLIED_MESSAGE.format({ date: snippet.timestamp })} */\n\n${snippet.content}\n\`\`\``
          )}
        </div>}

        {props.enabled && editing && <div className='card-body-content'>
          <CodeMirrorEditor
            value={snippet.content}
            onBlur={(value) => props.manager.updateSnippet(snippet.id, value)}
          />
        </div>}
      </div>

      {expanded && <div className='card-footer'>
        <div className='card-footer-author'>
          <div className='card-footer-author-avatar'>
            <Tooltip text={Messages.VIEW_PROFILE} delay={500}>
              <Avatar size={Avatar.Sizes.SIZE_32} src={author?.getAvatarURL() || getDefaultAvatarURL(snippet.author)} onClick={handleOnAuthorClick} />
            </Tooltip>
          </div>
          <div className='card-footer-author-name' onClick={handleOnAuthorClick}>
            {author?.tag || Messages.UNKNOWN_USER}
          </div>
        </div>

        <div className='card-footer-actions'>
          <Button
            size={Button.Sizes.SMALL}
            look={Button.Looks[editing ? 'OUTLINED' : 'FILLED']}
            color={Button.Colors.GREEN}
            onClick={handleOnEdit}
          >
            {editing ? Messages.CLOSE : Messages.EDIT}
          </Button>
          <Button
            size={Button.Sizes.SMALL}
            color={Button.Colors.RED}
            onClick={() => {
              try {
                props.manager.removeSnippet(snippet.id, { showToast: true });
              } catch (e) {
                props.main.error(e);
              }
            }}
          >
            {Messages.REMOVE}
          </Button>
          <Button
            size={Button.Sizes.SMALL}
            color={Button.Colors.BRAND}
            onClick={() => {
              try {
                props.manager.toggleSnippet(snippet.id, { showToast: true });
              } catch (e) {
                props.main.error(e);
              }
            }}
          >
            {props.enabled ? Messages.DISABLE : Messages.ENABLE}
          </Button>
        </div>
      </div>}
    </div>
  );
});
