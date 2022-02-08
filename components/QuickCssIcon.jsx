/**
 * NOTICE OF LICENSE
 *
 * This source file is subject to the Open Software License (OSL 3.0)
 * that is bundled with this plugin in the file LICENSE.
 * It is also available through the world-wide-web at this URL:
 * https://opensource.org/licenses/OSL-3.0
 *
 * DISCLAIMER
 *
 * Do not edit or add to this file if you wish to upgrade the plugin to
 * newer versions in the future. If you wish to customize the plugin for
 * your needs, please document your changes and make backups before you update.
 *
 *
 * @copyright Copyright (c) 2020-2021 GriefMoDz
 * @license   OSL-3.0 (Open Software License ('OSL') v. 3.0)
 * @link      https://github.com/GriefMoDz/notey
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const { React, getModule, i18n: { Messages } } = require('powercord/webpack');
const { HeaderBar, Icon } = require('powercord/components');
const { waitFor } = require('powercord/util');

module.exports = React.memo((compProps) => {
  const settingsModule = getModule([ 'open', 'saveAccountChanges' ], false);
  const handleOnClick = async () => {
    settingsModule.open('pc-moduleManager-themes');

    const quickCSSTab = await waitFor('.powercord-entities-manage-tabs [data-item-id="QUICK_CSS"]');
    quickCSSTab.click();
  };

  if (compProps.inSetting) {
    delete compProps.inSetting
    return <svg viewBox='0 0 24 24' {...compProps}>
      <path fill='currentColor' d='M 19.9958 12.8678 c 0.221 0.096 0.2375 0.1343 0.2527 0.358 c 0 1.7833 0.0057 3.5665 0 5.3498 c -0.0201 2.1379 -1.865 4.1325 -4.154 4.154 c -3.5644 0.011 -7.1286 0.0114 -10.693 0 c -2.1495 -0.0205 -4.1312 -1.8614 -4.1528 -4.153 c -0.0114 -3.5646 -0.0114 -7.1294 0 -10.694 c 0.0203 -2.1567 1.8597 -4.1456 4.1792 -4.153 l 8.3984 0 c 0.2795 0.0192 0.3331 0.1153 0.372 0.3027 c 0.0458 0.2208 0.1597 1.1927 -0.3393 1.2177 c -2.8067 0 -5.6134 -0.0087 -8.42 0.0002 c -1.7586 0.0165 -2.561 1.3968 -2.536 2.6948 c -0.0112 3.5614 -0.0112 7.1227 0 10.6843 c 0.0169 1.7678 1.722 2.6177 3.369 2.6427 c 3.5612 0.0114 7.1223 0.011 10.182 -0.05 c 1.623 -0.025 2.247 -1.248 2.271 -2.621 l 0.025 -5.391 c 0.0167 -0.2455 0.243 -0.4321 0.5073 -0.358 Z m 0.9703 -11.6227 c 1.2667 0.0251 2.28 1.6161 1.4406 2.8224 l -6.71 9.5182 c -0.0462 0.0581 -0.0608 0.0714 -0.1233 0.1115 l -3.0554 1.7317 c -0.2673 0.1317 -0.6105 -0.0933 -0.5582 -0.4134 l 0.7482 -3.3579 c 0.0177 -0.0642 0.0247 -0.0802 0.0604 -0.1364 l 6.7098 -9.518 c 0.338 -0.4733 0.8936 -0.7627 1.4879 -0.7581 Z l 2.2371 -1.2677 Z'/>
    </svg>
  }

  return (
    <HeaderBar.Icon
      icon={(props) => <svg viewBox='0 0 24 24' {...props} {...compProps}>
        <path fill='currentColor' d='M 19.9958 12.8678 c 0.221 0.096 0.2375 0.1343 0.2527 0.358 c 0 1.7833 0.0057 3.5665 0 5.3498 c -0.0201 2.1379 -1.865 4.1325 -4.154 4.154 c -3.5644 0.011 -7.1286 0.0114 -10.693 0 c -2.1495 -0.0205 -4.1312 -1.8614 -4.1528 -4.153 c -0.0114 -3.5646 -0.0114 -7.1294 0 -10.694 c 0.0203 -2.1567 1.8597 -4.1456 4.1792 -4.153 l 8.3984 0 c 0.2795 0.0192 0.3331 0.1153 0.372 0.3027 c 0.0458 0.2208 0.1597 1.1927 -0.3393 1.2177 c -2.8067 0 -5.6134 -0.0087 -8.42 0.0002 c -1.7586 0.0165 -2.561 1.3968 -2.536 2.6948 c -0.0112 3.5614 -0.0112 7.1227 0 10.6843 c 0.0169 1.7678 1.722 2.6177 3.369 2.6427 c 3.5612 0.0114 7.1223 0.011 10.182 -0.05 c 1.623 -0.025 2.247 -1.248 2.271 -2.621 l 0.025 -5.391 c 0.0167 -0.2455 0.243 -0.4321 0.5073 -0.358 Z m 0.9703 -11.6227 c 1.2667 0.0251 2.28 1.6161 1.4406 2.8224 l -6.71 9.5182 c -0.0462 0.0581 -0.0608 0.0714 -0.1233 0.1115 l -3.0554 1.7317 c -0.2673 0.1317 -0.6105 -0.0933 -0.5582 -0.4134 l 0.7482 -3.3579 c 0.0177 -0.0642 0.0247 -0.0802 0.0604 -0.1364 l 6.7098 -9.518 c 0.338 -0.4733 0.8936 -0.7627 1.4879 -0.7581 Z l 2.2371 -1.2677 Z'/>
      </svg>}
      onClick={handleOnClick}
      aria-label={Messages.CSS_TOGGLER_GO_TO_QUICK_CSS_TOOLTIP}
      tooltip={Messages.CSS_TOGGLER_GO_TO_QUICK_CSS_TOOLTIP}
    />
  );
});
