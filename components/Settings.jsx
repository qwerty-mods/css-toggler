const { React, Flux, getModuleByDisplayName, getModule, i18n: { Messages } } = require('powercord/webpack');
const { Button, Flex, FormTitle, Icon, settings: { RadioGroup, SwitchItem, TextInput } } = require('powercord/components');
const { SpecialChannels: { CSS_SNIPPETS } } = require('powercord/constants');
const { waitFor } = require('powercord/util');

const userStore = getModule([ 'getUser', 'getCurrentUser' ], false);
const currentUserId = getModule([ 'initialize', 'getId' ], false).getId();

const { MAX_CUSTOM_SNIPPET_ID_RANGE } = require('../constants');

const Icons = require('../../pc-updater/components/Icons');
const getMessage = require('../utils');

const SnippetCard = require('./SnippetCard');
let ConnectedSnippetCard;

const SearchBar = getModule(m => m?.displayName === 'SearchBar' && m?.defaultProps.hasOwnProperty('isLoading'), false);
const Tooltip = getModuleByDisplayName('Tooltip', false);
const TabBar = getModuleByDisplayName('TabBar', false);

const { tabBar, tabBarItem } = getModule([ 'tabBar', 'tabBarItem' ], false);
const { marginLeft8 } = getModule([ 'marginLeft8' ], false);

const breadcrumbClasses = getModule([ 'breadcrumbInactive', 'breadcrumbActive' ], false);

module.exports = class Settings extends React.Component {
  constructor (props) {
    super(props);

    this.currentUser = getModule([ 'getUser', 'getCurrentUser' ], false).getCurrentUser();
    this.settings = props.main.settings;
    this.snippetManager = props.main.snippetManager;
    this.snippetStore = props.main.snippetStore;
    this.state = {
      query: '',
      selectedItem: 'snippets'
    };

    ConnectedSnippetCard = Flux.connectStores([ this.snippetStore ], ({ id }) => ({
      snippet: this.snippetStore.getSnippet(id, { includeDetails: true }),
      enabled: this.snippetStore.isEnabled(id)
    }))(SnippetCard);
  }

  renderTopBar () {
    return <Flex>
      <SearchBar
        query={this.state.query}
        size={SearchBar.Sizes.MEDIUM}
        placeholder={Messages.SEARCH}
        onChange={(query) => this.setState({ query })}
        onClear={() => this.setState({ query: '' })}
      />
      <Button
        className={marginLeft8}
        color={Button.Colors.GREEN}
        look={Button.Looks.FILLED}
        size={Button.Sizes.SMALL}
        onClick={async () => {
          let customId = 1;
          while (this.props.main.snippetStore.getSnippet(customId.toString()) != undefined) {
            customId++;
          }

          this.props.main.snippetManager.addSnippet({
            id: customId.toString(),
            content: '/* Please replace me with your desired snippet */',
            author: {
              tag: this.currentUser.tag,
              id: this.currentUser.id
            }
          });

          this.props.main.snippetManager.updateSnippetDetails(customId.toString(), {
            title: '',
            description: ''
          });

          const snippetCard = await waitFor(`.css-toggler-snippet-card[data-key='${customId.toString()}']`);
          snippetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      >
        {Messages.CSS_TOGGLER_SNIPPET_ADD_NEW}
      </Button>
    </Flex>;
  }

  render () {
    const { selectedItem } = this.state;

    return (
      <div>
        {this.renderTabs()}
        {this.renderBreadcumb()}
        {selectedItem === 'snippets' && this.renderTopBar()}
        {this[`render${selectedItem[0].toUpperCase()}${selectedItem.slice(1)}`]()}
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
        type={TabBar.Types.TOP}
      >
        <TabBar.Item className={tabBarItem} id='snippets'>
          {`${Messages.CSS_TOGGLER_SNIPPETS_TITLE} (${this.snippetStore.getSnippetCount()})`}
        </TabBar.Item>
        <TabBar.Item className={tabBarItem} id='imports'>
          {`${Messages.CSS_TOGGLER_IMPORTS_TITLE} (0)`}
        </TabBar.Item>
        <TabBar.Item className={tabBarItem} id='settings'>
          {Messages.SETTINGS}
        </TabBar.Item>
        <TabBar.Item className={tabBarItem} id='updater'>
          {Messages.CSS_TOGGLER_UPDATER_TITLE}
        </TabBar.Item>
      </TabBar>
    );
  }

  renderBreadcumb () {
    const settingsModule = getModule([ 'open', 'saveAccountChanges' ], false);
    const handleOnClick = async () => {
      settingsModule.open('pc-moduleManager-themes');

      const quickCSSTab = await waitFor('.powercord-entities-manage-tabs [data-item-id="QUICK_CSS"]');
      quickCSSTab.click();
    };

    const { selectedItem } = this.state;

    return <Flex align={Flex.Align.CENTER} className={breadcrumbClasses.breadcrumbs}>
      <FormTitle tag='h1' className='css-toggler-settings-title'>
        {selectedItem === 'settings' ? Messages.SETTINGS : Messages[`CSS_TOGGLER_${selectedItem.toUpperCase()}_TITLE`]}
        {(selectedItem === 'snippets' || selectedItem === 'imports') && <Tooltip text={Messages.CSS_TOGGLER_GO_TO_QUICK_CSS_TOOLTIP} position='right'>
          {(props) => <Icon {...props} onClick={handleOnClick} className='css-toggler-quick-css-jump-icon' name='Pencil' />}
        </Tooltip>}
      </FormTitle>
    </Flex>;
  }

  renderImports () {
    return null;
  }

  renderSnippets () {
    const { snippets } = this.props;

    const sortOption = this.props.getSetting('sort', 'default');
    const prioritizeSelf = this.props.getSetting('sort-me');
    const searchFilter = (id) => {
      const snippet = snippets[id];
      const lowerCaseQuery = this.state.query.toLowerCase();

      if (this.state.query !== '') {
        return (snippet.details?.title?.toLowerCase())?.includes(lowerCaseQuery) || (snippet.details?.description?.toLowerCase())?.includes(lowerCaseQuery) || (id.includes(lowerCaseQuery));
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
    }).map((id, index) => (
      <ConnectedSnippetCard
        id={id}
        key={id}
        index={index + 1}
        expanded={!this.props.getSetting('collapsedSnippets', []).includes(id)}
        manager={this.snippetManager}
        main={this.props.main}
      />
    ));
  }

  renderUpdater () {
    const { updateSetting, getSetting, toggleSetting } = this.props;

    const moment = getModule([ 'momentProperties' ], false);
    const updating = this.props.getSetting('updating', false);
    const checking = this.props.getSetting('checking', false);
    const disabled = this.props.getSetting('disabled', false);
    const paused = this.props.getSetting('paused', false);
    const failed = this.props.getSetting('failed', false);

    const updates = this.props.getSetting('updates', []);
    const disabledEntities = this.props.getSetting('entities_disabled', []);
    const checkingProgress = this.props.getSetting('checking_progress', [ 0, 0 ]);
    const last = moment(this.props.getSetting('last_check', false)).calendar();

    let icon,
      title;
    if (disabled) {
      icon = <Icons.Update color='#f04747'/>;
      title = Messages.POWERCORD_UPDATES_DISABLED;
    } else if (paused) {
      icon = <Icons.Paused/>;
      title = Messages.POWERCORD_UPDATES_PAUSED;
    } else if (checking) {
      icon = <Icons.Update color='#7289da' animated/>;
      title = Messages.POWERCORD_UPDATES_CHECKING;
    } else if (updating) {
      icon = <Icons.Update color='#7289da' animated/>;
      title = Messages.CSS_TOGGLER_UPDATES_UPDATING;
    } else if (failed) {
      icon = <Icons.Error/>;
      title = Messages.POWERCORD_UPDATES_FAILED;
    } else if (updates.length > 0) {
      icon = <Icons.Update/>;
      title = Messages.POWERCORD_UPDATES_AVAILABLE;
    } else {
      icon = <Icons.UpToDate/>;
      title = Messages.CSS_TOGGLER_UPDATES_UP_TO_DATE;
    }

    return <>
      <div class='css-toggler-settings-updater powercord-updater powercord-text'>
        <div class='top-section'>
          <div className='icon'>{icon}</div>
          <div className='status'>
            <h3>{title}</h3>
            {!disabled && !updating && (!checking || checkingProgress[1] > 0) && <div>
              {paused
                ? Messages.POWERCORD_UPDATES_PAUSED_RESUME
                : checking
                  ? Messages.POWERCORD_UPDATES_CHECKING_STATUS.format({
                    checked: checkingProgress[0],
                    total: checkingProgress[1]
                  })
                  : Messages.POWERCORD_UPDATES_LAST_CHECKED.format({ date: last })}
            </div>}
          </div>
          <div className='about'>
            <div>
              <span>{Messages.CSS_TOGGLER_SNIPPETS_TITLE}:</span>
              <span>{this.snippetStore.getSnippetCount()}</span>
            </div>
          </div>
        </div>
        <div className='buttons'>
        {disabled || paused
          ? <Button
            size={Button.Sizes.SMALL}
            color={Button.Colors.GREEN}
            onClick={() => {
              this.props.updateSetting('paused', false);
              this.props.updateSetting('disabled', false);
            }}
          >
            {disabled ? Messages.POWERCORD_UPDATES_ENABLE : Messages.POWERCORD_UPDATES_RESUME}
          </Button>
          : (!checking && !updating && <>
            {updates.length > 0 && <Button
              size={Button.Sizes.SMALL}
              color={failed ? Button.Colors.RED : Button.Colors.GREEN}
              onClick={() => console.log('force/update')}
            >
              {failed ? Messages.POWERCORD_UPDATES_FORCE : Messages.POWERCORD_UPDATES_UPDATE}
            </Button>}
            <Button
              size={Button.Sizes.SMALL}
              onClick={this.updateSnippets.bind(this)}
            >
              {Messages.POWERCORD_UPDATES_CHECK}
            </Button>
            <Button
              size={Button.Sizes.SMALL}
              color={Button.Colors.YELLOW}
              onClick={() => this.props.updateSetting('paused', true)}
            >
              {Messages.POWERCORD_UPDATES_PAUSE}
            </Button>
            <Button
              size={Button.Sizes.SMALL}
              color={Button.Colors.RED}
              onClick={() => this.props.updateSetting('disabled', true)}
            >
              {Messages.POWERCORD_UPDATES_DISABLE}
            </Button>
          </>)}
        </div>
      </div>
      {!disabled && <>
        <FormTitle className='powercord-updater-ft'>{Messages.OPTIONS}</FormTitle>
        <SwitchItem
          value={getSetting('automatic', false)}
          onChange={() => toggleSetting('automatic')}
          note={Messages.CSS_TOGGLER_UPDATES_OPTS_AUTO}
        >
          {Messages.POWERCORD_UPDATES_OPTS_AUTO}
        </SwitchItem>
        <TextInput
          note={Messages.POWERCORD_UPDATES_OPTS_INTERVAL_DESC.replace('Powercord', 'CSS Toggler')}
          onChange={val => updateSetting('interval', (Number(val) && Number(val) >= 10) ? Math.ceil(Number(val)) : 10, 15)}
          defaultValue={getSetting('interval', 15)}
          required={true}
        >
          {Messages.POWERCORD_UPDATES_OPTS_INTERVAL}
        </TextInput>
        <TextInput
          note={Messages.POWERCORD_UPDATES_OPTS_CONCURRENCY_DESC.replace('Powercord', 'CSS Toggler')}
          onChange={val => updateSetting('concurrency', (Number(val) && Number(val) >= 1) ? Math.ceil(Number(val)) : 1, 2)}
          defaultValue={getSetting('concurrency', 2)}
          required={true}
        >
          {Messages.POWERCORD_UPDATES_OPTS_CONCURRENCY}
        </TextInput>
      </>}
    </>
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

  async updateSnippets () {
    const { updateSetting, getSetting } = this.props;

    if (getSetting('disabled', false) || getSetting('paused', false) || getSetting('checking', false) || getSetting('updating', false)) return;

    updateSetting('checking', true);
    updateSetting('checking_progress', [ 0, 0 ]);

    Object.keys(this.props.snippets).map(async (id) => {
      if (id < MAX_CUSTOM_SNIPPET_ID_RANGE) return; // Skip Custom Snippets

      const snippet = this.props.snippets[id];
      let channel = snippet?.channel || CSS_SNIPPETS;

      const message = await getMessage(channel.toString(), id.toString());

      let content = '';
      for (const match of message.content.matchAll(/`{3}css\n([\s\S]*)`{3}/ig)) {
        let block = match[1].trim();

        content += `${block}\n`;
      }

      // this.snippetManager.updateSnippet(message.id, content);
    });

    updateSetting('last_check', Date.now());
    updateSetting('checking', false);
  }
};