const { React, getModuleByDisplayName, getModule, i18n: { Messages } } = require('powercord/webpack');
const { Flex, FormTitle, settings: { RadioGroup, SwitchItem } } = require('powercord/components');

const TabBar = getModuleByDisplayName('TabBar', false);
const users = getModule(["getUser", "getCurrentUser"], false);
const currentUser = users.getCurrentUser();

const SnippetCard = require('./SnippetCard');
let ConnectedSnippetCard;

module.exports = class Settings extends React.Component {
  constructor (props) {
    super(props);

    this.state = {
      selectedItem: "snippets"
    };

    this.settings = props.main.settings;
    this.snippetManager = props.main.snippetManager;

    ConnectedSnippetCard = this.settings.connectStore(SnippetCard);
  }

  render () {
    return (
      <div>
        {this.renderTabs()}
        {this.renderBreadcumb()}
        {this.state.selectedItem === "snippets" ? this.renderSnippets() : this.renderSettings()}
      </div>
    )
  }
  
  renderTabs() {
    const { tabBar, tabBarItem } = getModule([ 'tabBar', 'tabBarItem' ], false);
    const handleOnItemSelect = (selectedItem) => {
      this.setState({
        selectedItem
      });
    };

    return (
      <TabBar
        className={[ 'css-toggler-settings-tabbar', tabBar ].filter(Boolean).join(' ')}
        selectedItem={this.state.category}
        onItemSelect={handleOnItemSelect}
        look={TabBar.Looks.BRAND}
        type={TabBar.Types.TOP}>
        <TabBar.Item className={tabBarItem} id='snippets'>
          Snippets
        </TabBar.Item>
        <TabBar.Item className={tabBarItem} id='settings'>
          {Messages.SETTINGS}
        </TabBar.Item>
      </TabBar>
    );
  }

  renderBreadcumb() {
    const breadcrumbClasses = getModule([ 'breadcrumbInactive', 'breadcrumbActive' ], false);

    return <Flex align={Flex.Align.CENTER} className={breadcrumbClasses.breadcrumbs}>
      <FormTitle tag='h1' className='css-toggler-settings-title'>
        {this.state.category === "snippets" ? Snippets : Messages.Settings}
      </FormTitle>
    </Flex>;
  }

  renderSnippets() {
    const snippets = this.snippetManager.getSnippets({
      includeDetails: true,
      includeCached: true
    });

    return <>{Object.keys(snippets).sort((a, b) => {
      if (this.props.getSetting('sort', 'default') === "user") {
        const author1 = users.getUser(snippets[a].author);
        const author2 = users.getUser(snippets[b].author);
        
        return author1.username.localeCompare(author2.username);
      } else if (this.props.getSetting('sort', 'default') === "alphabetically") {
        return snippets[a].details?.title.localeCompare(snippets[b].details?.title);
      }

      return 0; // fallback
    }).sort((a, b) => {
      if (this.props.getSetting('sort-me')) {
        const author1 = users.getUser(snippets[a].author);
        const author2 = users.getUser(snippets[b].author);

        if (author1.id === currentUser.id === author2.id) return 0;
        if (author1.id === currentUser.id) return -1;
        if (author2.id === currentUser.id) return 1;

        return 0;
      }
    }).map((id, index) => {
      const snippet = snippets[id];
      snippet.id = id;

      return (
        <ConnectedSnippetCard
          key={id}
          snippet={snippet}
          title={snippet.details?.title || `Untitled Snippet #${index + 1}`}
          forceUpdate={this.forceUpdate.bind(this)}
          manager={this.snippetManager}
        />
      );
    })}</>;
  }

  renderSettings() {
    const { updateSetting, getSetting, toggleSetting } = this.props;
    return <>
      <RadioGroup
        onChange={(e) => updateSetting('sort', e.value)}
        value={getSetting('sort', 'default')}
        options={[
          {
            name: 'Default',
            desc: 'Ordered as placed in Quick CSS',
            value: 'default'
          },
          {
            name: 'User',
            desc: 'Sorts by users in alphabetical order.',
            value: 'user'
          },
          {
            name: 'Alphabetically',
            desc: 'Sorts by snippet name in alphabetical order.',
            value: 'alphabetically'
          }
        ]}
      >
        Sort snippets
      </RadioGroup>
      
      <SwitchItem
        note="Your snippets will be ordered first"
        value={getSetting('sort-me', false)}
        onChange={(e) => toggleSetting('sort-me')}
      >Prioritize my Snippets</SwitchItem>
    </>;
  }
};