const { React, getModule, getModuleByDisplayName } = require('powercord/webpack');

const { default: Button } = getModule(m => m.ButtonLink, false);
const { default: Avatar } = getModule([ 'AnimatedAvatar' ], false);

const { DEFAULT_AVATARS } = getModule([ 'getDefaultAvatarURL' ], false);

const TextInput = getModuleByDisplayName('TextInput', false);
const parser = getModule([ 'parse', 'parseTopic' ], false);

// TODO: Replace placeholders with actual prop values.
module.exports = React.memo(props => {
  const [ title, setTitle ] = React.useState(props.name);

  return (
    <div className='css-toggler-snippet-card'>
      <div className='card-header'>
        <div className='card-header-title'>
          <TextInput
            size='mini'
            maxLength={32}
            value={title || 'Unnamed Snippet'}
            placeholder='Enter a title'
            className='card-header-title-input'
            inputClassName='card-header-title-input-box'
            onChange={setTitle}
          />
          <div className='card-header-title-placeholder'>
            {title}
          </div>
        </div>

        <div className='card-header-snippet-id'>
          ID: {props.id}
        </div>
      </div>

      <div className='card-body'>
        {props.description !== null && <div className='card-body-description'>
          {props.description}
        </div>}
        <div className='card-body-content'>
          {parser.reactParserFor(parser.defaultRules)(`\`\`\`css\n${props.content}\n\`\`\``)}
        </div>
      </div>

      <div className='card-footer'>
        <div className='card-footer-author'>
          <div className='card-footer-author-avatar'>
            <Avatar size={Avatar.Sizes.SIZE_32} src={DEFAULT_AVATARS[Math.floor(Math.random() * 5) % DEFAULT_AVATARS.length]}></Avatar>
          </div>
          <div className='card-footer-author-name'>
            Discord#0000
          </div>
        </div>

        <div className='card-footer-actions'>
          <Button size={Button.Sizes.SMALL} color={Button.Colors.GREEN}>Edit</Button>
          <Button size={Button.Sizes.SMALL} color={Button.Colors.RED}>Remove</Button>
          <Button size={Button.Sizes.SMALL} color={Button.Colors.BRAND}>Disable</Button>
        </div>
      </div>
    </div>
  );
});
