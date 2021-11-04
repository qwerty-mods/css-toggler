const { React, Flux, getModuleByDisplayName, getModule, i18n: { Messages } } = require('powercord/webpack');
const { Flex, FormTitle, settings: { RadioGroup, SwitchItem } } = require('powercord/components');

const userStore = getModule([ 'getUser', 'getCurrentUser' ], false);
const currentUserId = getModule([ 'initialize', 'getId' ], false).getId();

const SnippetCard = require('./SnippetCard');
let ConnectedSnippetCard;

const SearchBar = getModule(m => m?.displayName === 'SearchBar' && m?.defaultProps.hasOwnProperty('isLoading'), false);
const TabBar = getModuleByDisplayName('TabBar', false);

const { tabBar, tabBarItem } = getModule([ 'tabBar', 'tabBarItem' ], false);
const breadcrumbClasses = getModule([ 'breadcrumbInactive', 'breadcrumbActive' ], false);

module.exports = class Settings extends React.Component {
  constructor (props) {
    super(props);

    this.settings = props.main.settings;
    this.snippetManager = props.main.snippetManager;
    this.snippetStore = props.main.snippetStore;
    this.state = {
      query: '',
      selectedItem: 'snippets'
    };

    ConnectedSnippetCard = Flux.connectStores([ this.snippetStore ], ({ snippet }) => ({
      removed: !this.snippetStore.getSnippet(snippet.id),
      enabled: this.snippetStore.isEnabled(snippet.id)
    }))(SnippetCard);
  }

  renderSearchBar () {
    return <SearchBar
      query={this.state.query}
      size={SearchBar.Sizes.MEDIUM}
      placeholder={Messages.SEARCH}
      onChange={(query) => this.setState({ query })}
      onClear={() => this.setState({ query: '' })}
    />;
  }

  render () {
    return (
      <div>
        {this.renderTabs()}
        {this.renderBreadcumb()}
        {this.state.selectedItem === 'snippets' && this.renderSearchBar()}
        {this.state.selectedItem === 'snippets' ? this.renderSnippets() : this.renderSettings()}
      </div>
    )
  }

  renderTabs () {
    const handleOnItemSelect = (selectedItem) => this.setState({ selectedItem });

    return (
      <TabBar
        className={[ 'css-toggler-settings-tab-bar', tabBar ].filter(Boolean).join(' ')}
        selectedItem={this.state.selectedItem}
        onItemSelect={handleOnItemSelect}
        look={TabBar.Looks.BRAND}
        type={TabBar.Types.TOP}>
        <TabBar.Item className={tabBarItem} id='snippets'>
          {Messages.CSS_TOGGLER_SNIPPETS_TITLE}
        </TabBar.Item>
        <TabBar.Item className={tabBarItem} id='settings'>
          {Messages.SETTINGS}
        </TabBar.Item>
      </TabBar>
    );
  }

  renderBreadcumb () {
    return <Flex align={Flex.Align.CENTER} className={breadcrumbClasses.breadcrumbs}>
      <FormTitle tag='h1' className='css-toggler-settings-title'>
        {this.state.selectedItem === 'snippets' ? Messages.CSS_TOGGLER_SNIPPETS_TITLE : Messages.SETTINGS}
      </FormTitle>
    </Flex>;
  }

  renderSnippets () {
    const snippets = this.snippetStore.getSnippets({
      includeDetails: true,
      includeCached: true
    });

    const sortOption = this.props.getSetting('sort', 'default');
    const prioritizeSelf = this.props.getSetting('sort-me');
    const searchFilter = (id) => {
      const snippet = snippets[id];
      const lowerCaseQuery = this.state.query.toLowerCase();

      if (this.state.query !== '') {
        return (snippet.details?.title?.toLowerCase())?.includes(lowerCaseQuery) || (snippet.details?.description?.toLowerCase())?.includes(lowerCaseQuery);
      }

      return id;
    };

    return Object.keys(snippets).filter(searchFilter).sort((a, b) => {
      if (sortOption === 'user') {
        const author1 = userStore.getUser(snippets[a].author);
        const author2 = userStore.getUser(snippets[b].author);

        return author1.username.localeCompare(author2.username);
      } else if (sortOption === 'alphabetically') {
        return snippets[a].details?.title.localeCompare(snippets[b].details?.title);
      }

      return 0; // fallback
    }).sort((a, b) => {
      const snippetAuthorId1 = snippets[a].author;
      const snippetAuthorId2 = snippets[b].author;

      if (prioritizeSelf) {
        if (Object.keys(snippets).indexOf(b) === 0 && snippetAuthorId2 === currentUserId) {
          return 0;
        }

        return snippetAuthorId1 === currentUserId ? -1 : snippetAuthorId2 === currentUserId ? 1 : 0;
      }
    }).map(id => {
      const snippet = snippets[id];
      snippet.id = id;

      return (
        <ConnectedSnippetCard
          key={id}
          snippet={snippet}
          title={snippet.details.title}
          manager={this.snippetManager}
          main={this.props.main}
        />
      );
    });
  }

  renderSettings () {
    const { updateSetting, getSetting, toggleSetting } = this.props;

    return <>
      <RadioGroup
        onChange={(e) => updateSetting('sort', e.value)}
        value={getSetting('sort', 'default')}
        options={[
          {
            name: Messages.CSS_TOGGLER_SORT_SNIPPETS_DEFAULT_OPT,
            desc: Messages.CSS_TOGGLER_SORT_SNIPPETS_DEFAULT_OPT_DESC,
            value: 'default'
          },
          {
            name: Messages.CSS_TOGGLER_SORT_SNIPPETS_USER_OPT,
            desc: Messages.CSS_TOGGLER_SORT_SNIPPETS_USER_OPT_DESC,
            value: 'user'
          },
          {
            name: Messages.CSS_TOGGLER_SORT_SNIPPETS_ALPHABETICALLY_OPT,
            desc: Messages.CSS_TOGGLER_SORT_SNIPPETS_ALPHABETICALLY_OPT_DESC,
            value: 'alphabetically'
          }
        ]}
      >
        {Messages.CSS_TOGGLER_SORT_SNIPPETS_TITLE}
      </RadioGroup>

      <SwitchItem
        note={Messages.CSS_TOGGLER_PRIORITIZE_MY_SNIPPETS_DESC}
        value={getSetting('sort-me', false)}
        onChange={() => toggleSetting('sort-me')}
      >
        {Messages.CSS_TOGGLER_PRIORITIZE_MY_SNIPPETS_TITLE}
      </SwitchItem>
    </>;
  }
};