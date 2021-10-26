const { React, getModule } = require('powercord/webpack');

const parser = getModule([ 'parse', 'parseTopic' ], false);

module.exports = React.memo(props => {
  return (
    <div className='css-toggler-snippet-card'>
      <div className='css-toggler-snippet-card-header'>
        <div className='css-toggler-snippet-card-header-title'>
          {props.name}

          <div className='css-toggler-snippet-card-header-title-right'>
            ID: {props.id}
          </div>
        </div>
      </div>

      <div className='css-toggler-snippet-card-body'>
        {props.description !== null && <div className='css-toggler-snippet-card-body-description'>
          {props.description}
        </div>}
        <div className='css-toggler-snippet-card-body-content'>
          {parser.reactParserFor(parser.defaultRules)(`\`\`\`css\n${props.content}\n\`\`\``)}
        </div>
      </div>

      <div className='css-toggler-snippet-card-footer'>
        <div className='css-toggler-snippet-card-footer-right'>
        </div>
      </div>
    </div>
  );
});
