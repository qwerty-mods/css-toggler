const { React, Flux, i18n: { Messages } } = require('powercord/webpack');
const { SwitchItem, SliderInput } = require('powercord/components/settings');
const { AsyncComponent, Clickable, FormTitle, Tooltip, AdvancedScrollerThin, Icons: { Gear, Close } } = require('powercord/components');

const CodeMirror = require('../../../src/Powercord/coremods/moduleManager/components/manage/CodeMirror');

class CodeMirrorEditor extends React.PureComponent {
  constructor () {
    super();

    this.state = {
      showSettings: false,
      codeMirror: null
    };

    this.ref = React.createRef();
    this._handleCodeMirrorUpdate = global._.debounce(this._handleCodeMirrorUpdate.bind(this), 300);
  }

  render () {
    return (
      <>
        <div
          className='powercord-quickcss'
          style={{ '--editor-height': this.state.showSettings ? '325px' : '-1px' }}
          ref={this.ref}
        >
          <div className='powercord-quickcss-header'>
            <Tooltip text={Messages.SETTINGS} position='right'>
              <Clickable onClick={() => this.setState({ showSettings: true })} className='button'>
                <Gear/>
              </Clickable>
            </Tooltip>
          </div>
          <div className='powercord-quickcss-editor'>
            {this.state.showSettings && this.renderSettings()}
            <CodeMirror
              onReady={(codeMirror) => this.setupCodeMirror(codeMirror)}
              getSetting={this.props.getSetting}
            />
          </div>
          <div className='powercord-quickcss-footer'>
            <span>{Messages.POWERCORD_QUICKCSS_AUTOCOMPLETE}</span>
            <span>CodeMirror v{require('codemirror').version}</span>
          </div>
        </div>
      </>
    );
  }

  renderSettings () {
    const { getSetting, updateSetting, toggleSetting } = this.props;

    return (
      <AdvancedScrollerThin className='powercord-quickcss-editor-settings' theme='themeGhostHairline-DBD-2d' fade>
        <FormTitle tag='h2'>{Messages.POWERCORD_QUICKCSS_SETTINGS}</FormTitle>
        <div className='close-wrapper'>
          <Tooltip text={Messages.CLOSE} position='left'>
            <Clickable onClick={() => this.setState({ showSettings: false })} className='close'>
              <Close/>
            </Clickable>
          </Tooltip>
        </div>
        <div className='settings'>
          <SwitchItem
            value={getSetting('cm-lineNumbers', true)}
            onChange={(value) => (toggleSetting('cm-lineNumbers', true), this.state.codeMirror.setOption('lineNumbers', value))}
          >
            {Messages.POWERCORD_QUICKCSS_SETTINGS_LINES}
          </SwitchItem>
          <SwitchItem
            value={getSetting('cm-codeFolding', true)}
            onChange={(value) => {
              toggleSetting('cm-codeFolding', true);

              if (!value) {
                this.state.codeMirror.execCommand('unfoldAll');
              }

              this.state.codeMirror.setOption('foldGutter', value);
            }}
          >
            {Messages.POWERCORD_QUICKCSS_SETTINGS_FOLDING}
          </SwitchItem>
          <SwitchItem
            value={getSetting('cm-matchBrackets', true)}
            note={Messages.POWERCORD_QUICKCSS_SETTINGS_MATCH_BRACKETS_DESC}
            onChange={v => {
              toggleSetting('cm-matchBrackets', true);

              this.state.codeMirror.setOption('matchBrackets', v);
            }}
          >
            {Messages.POWERCORD_QUICKCSS_SETTINGS_MATCH_BRACKETS}
          </SwitchItem>
          <SwitchItem
            value={getSetting('cm-closeBrackets', true)}
            note={Messages.POWERCORD_QUICKCSS_SETTINGS_CLOSE_BRACKETS_DESC}
            onChange={(value) => (toggleSetting('cm-closeBrackets', true), this.state.codeMirror.setOption('autoCloseBrackets', value))}
          >
            {Messages.POWERCORD_QUICKCSS_SETTINGS_CLOSE_BRACKETS}
          </SwitchItem>
          <SwitchItem
            value={getSetting('cm-wrap', false)}
            onChange={(value) => (toggleSetting('cm-wrap', false), this.state.codeMirror.setOption('lineWrapping', value))}
          >
            {Messages.POWERCORD_QUICKCSS_SETTINGS_WRAP}
          </SwitchItem>
          <SwitchItem
            value={getSetting('cm-tabs', false)}
            onChange={(value) => (toggleSetting('cm-tabs', false), this.state.codeMirror.setOption('indentWithTabs', value))}
          >
            {Messages.POWERCORD_QUICKCSS_SETTINGS_TABS}
          </SwitchItem>
          <SliderInput
            stickToMarkers
            initialValue={4}
            markers={[ 2, 4, 8 ]}
            onMarkerRender={(marker) => `${marker} spaces`}
            defaultValue={getSetting('cm-indentSize', 2)}
            onValueChange={(value) => {
              updateSetting('cm-indentSize', value);

              this.state.codeMirror.setOption('tabSize', value);
              this.state.codeMirror.setOption('indentUnit', value);
            }}
          >
            {Messages.POWERCORD_QUICKCSS_SETTINGS_INDENT}
          </SliderInput>
        </div>
      </AdvancedScrollerThin>
    );
  }

  setupCodeMirror (codeMirror) {
    codeMirror.on('change', () => this._handleCodeMirrorUpdate(codeMirror.getValue()));
    codeMirror.setValue(this.props.value);

    this.setState({ codeMirror });
  }

  _handleCodeMirrorUpdate (newValue) {
    if (newValue.length > 0) {
      this.props.onChange(newValue);
    }
  }
}

module.exports = AsyncComponent.from((async () => {
  return Flux.connectStores([ powercord.api.settings.store ], () => ({
    ...powercord.api.settings._fluxProps('pc-moduleManager')
  }))(CodeMirrorEditor);
})());
