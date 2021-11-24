const { React, getModule, getModuleByDisplayName, i18n: { Messages } } = require('powercord/webpack');
const { TextAreaInput } = require('powercord/components/settings');
const { Clickable, Icon, Icons: { GitHub } } = require('powercord/components');

const { default: Button } = getModule([ 'ButtonLink' ], false);

const Caret = getModuleByDisplayName('Caret', false);
const TextInput = getModuleByDisplayName('TextInput', false);
const Tooltip = getModuleByDisplayName('Tooltip', false);

const parser = getModule([ 'parse', 'parseTopic' ], false);

const { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH, DEFAULT_IMPORT_TITLE } = require('../constants');

module.exports = React.memo(props => {
  const $import = props.import;

  if (!$import) {
    return null;
  }

  const isURLGitHubPages = $import.url.includes('github.io');
  const isNewCustomImport = $import.url === '/* Please replace me with your desired import */';
  const defaultTitle = isNewCustomImport ? 'New Custom Import' : `${DEFAULT_IMPORT_TITLE} #${props.index}`;

  const [ title, setTitle ] = React.useState($import.details?.title || defaultTitle);
  const [ description, setDescription ] = React.useState($import.details?.description);
  const [ url, setUrl ] = React.useState($import.url);
  const [ expanded, setExpanded ] = React.useState(props.expanded);
  const [ editing, setEditing ] = React.useState(isNewCustomImport);

  const handleOnEdit = React.useCallback(() => setEditing(!editing), [ editing ]);
  const handleOnTitleBlur = React.useCallback(() => {
    const titleTrimmed = title.trim();
    setTitle(titleTrimmed);

    const isEmptyOrDefault = titleTrimmed === '' || titleTrimmed.startsWith(DEFAULT_IMPORT_TITLE);
    if (isEmptyOrDefault) {
      setTitle(titleTrimmed === '' ? defaultTitle : titleTrimmed);
    }

    props.manager.updateImportDetails($import.url, { title: isEmptyOrDefault ? '' : titleTrimmed });
  }, [ title ]);

  const handleOnSourceClick = () => {
    try {
      if (isURLGitHubPages) {
        const [ _, github, repo ] = $import.url.match(/(?:https?:\/\/)?(.+)\.github\.io\/(.+?)\/.+/);

        if (github && repo) {
          window.open(`https://github.com/${github}/${repo}`, '_blank');
        }
      } else {
        window.open($import.url, '_blank');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOnExpand = React.useCallback(() => {
    setExpanded(!expanded);
    setEditing(false);

    props.manager.toggleCollapse($import.url);
  }, [ expanded ]);

  return (
    <div className='css-toggler-import-card' data-key={props.index} data-editing={editing} data-expanded={expanded} data-hasdescription={Boolean(description)}>
      <div className='card-header'>
        <div className='card-header-title'>
          <TextInput
            size='mini'
            maxLength={MAX_TITLE_LENGTH}
            value={title.startsWith(DEFAULT_IMPORT_TITLE) ? '' : title}
            placeholder={title.startsWith(DEFAULT_IMPORT_TITLE) ? '' : Messages.CSS_TOGGLER_TITLE_PLACEHOLDER}
            className='card-header-title-input'
            inputClassName='card-header-title-input-box'
            onChange={(value) => setTitle(value.startsWith(DEFAULT_IMPORT_TITLE) ? title : value)}
            onBlur={handleOnTitleBlur}
          />
          <div className='card-header-title-placeholder'>
            {title}
          </div>
        </div>

        <div className='card-header-import-status'>
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
            placeholder={Messages.CSS_TOGGLER_IMPORT_DESC_PLACEHOLDER}
            className='card-body-description-input-box'
            onChange={setDescription}
            onBlur={() => props.manager.updateImportDetails($import.url, { description })}
            autosize={true}
          />
        </div>}

        {(!props.enabled || !editing) && expanded && <div className='card-body-content'>
          {parser.reactParserFor(parser.defaultRules)(
            `\`\`\`css\n${isNewCustomImport ? $import.url : `@import url('${$import.url}')`}\n\`\`\``
          )}
        </div>}

        {props.enabled && editing && <div className='card-body-content'>
          <TextInput
            value={url}
            onChange={setUrl}
            onBlur={() => {
              try {
                props.manager.updateImport($import.url, url)
              } catch (e) {
                console.error(e);
              }
            }}
          />
        </div>}
      </div>

      {expanded && <div className='card-footer'>
        <div className='card-footer-source'>
          <div className='card-footer-source-icon'>
            <Tooltip text={isURLGitHubPages ? Messages.CSS_TOGGLER_VIEW_REPOSITORY : Messages.CSS_TOGGLER_VIEW_SOURCE} delay={500}>
              {(props) => <Clickable onClick={handleOnSourceClick}>
                {isURLGitHubPages ? <GitHub {...props} /> : <Icon {...props} name='Link' />}
              </Clickable>}
            </Tooltip>
          </div>
          <div className='card-footer-source-name' onClick={handleOnSourceClick}>
            {isURLGitHubPages ? Messages.CSS_TOGGLER_VIEW_REPOSITORY : Messages.CSS_TOGGLER_VIEW_SOURCE}
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
                props.manager.removeImport($import.url, { showToast: true });
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
                props.manager.toggleImport($import.url, { showToast: true });
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
