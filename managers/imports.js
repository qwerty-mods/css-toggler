const { FluxDispatcher, i18n: { Messages } } = require('powercord/webpack');
const { FluxActions } = require('../constants');

let toasts = [];

function sendToast (url, enabled, callback) {
  const statusText = enabled === true ? 'Enabled' : enabled === false ? 'Disabled' : 'Removed';
  const $import = this.importStore.getImport(url, { includeDetails: true });

  const toastId = `css-toggler-${Math.random().toString(36)}`;
  toasts.push(toastId);

  powercord.api.notices.sendToast(toastId, {
    header: `${statusText} Import`,
    timeout: 5e3,
    content: `You've ${statusText.toLowerCase()} import '${$import.details?.title ? $import.details.title : url}'`,
    buttons: [
      toasts.length > 1 && {
        text: Messages.CSS_TOGGLER_DISMISS_ALL,
        look: 'ghost',
        size: 'small',
        onClick: () => toasts.forEach(id => powercord.api.notices.closeToast(id))
      },
      {
        text: Messages.DISMISS,
        look: 'ghost',
        size: 'small'
      },
      enabled !== null && {
        text: enabled === true ? Messages.DISABLE : Messages.ENABLE,
        look: 'ghost',
        size: 'small',
        onClick: () => callback(url)
      }
    ].filter(Boolean)
  });
}

powercord.api.notices.on('toastLeaving', (toastId) => {
  if (toastId.startsWith('css-toggler-')) {
    toasts = toasts.filter(id => toastId !== id);
  }
});

const { getSetting, updateSetting } = powercord.api.settings._fluxProps('css-toggler');

module.exports = class ImportManager {
  constructor (main) {
    this.main = main;
    this.importDetails = main.settings.get('importDetails', {});
    this.importStore = main.importStore;

    this.fetchImports();
  }

  fetchImports () {
    const importMatches = this.main.moduleManager._quickCSS.matchAll(/@import url\(["']?([^"']+)["']?\)/g);
    const imports = [ ...(new Set([ ...importMatches ].map(([ , url ]) => url))) ];

    FluxDispatcher.dispatch({
      type: FluxActions.IMPORTS_FETCH,
      imports
    });

    return imports;
  }

  toggleCollapse (url) {
    const collapsedImports = getSetting('collapsedImports', []);

    if (collapsedImports.includes(url)) {
      collapsedImports.splice(collapsedImports.indexOf(url), 1);
    } else {
      collapsedImports.push(url);
    }

    updateSetting('collapsedImports', collapsedImports);
  }

  updateImportDetails (url, newDetails) {
    if (typeof newDetails !== 'object') {
      return;
    }

    this.importDetails[url] = {
      title: newDetails.title ?? this.importDetails[url]?.title,
      description: newDetails.description ?? this.importDetails[url]?.description
    };

    if (!this.importDetails[url].title) {
      delete this.importDetails[url].title;
    }

    if (!this.importDetails[url].description) {
      delete this.importDetails[url].description;
    }

    if (!this.importDetails[url].title && !this.importDetails[url].description) {
      delete this.importDetails[url];
    }

    updateSetting('importDetails', this.importDetails);
  }

  async updateImport (url, newUrl) {
    const $import = this.importStore.getImport(url);

    if ($import) {
      if ($import === newUrl) {
        return;
      }

      let quickCSS = this.main.moduleManager._quickCSS;
      const match = quickCSS.match(new RegExp(`@import url\\(["']?${global._.escapeRegExp($import)}["']?\\)`));

      if (match) {
        const newImport = match[0].replace($import, newUrl);

        quickCSS = quickCSS.replaceAll(match[0], newImport);

        await this.main.moduleManager._saveQuickCSS(quickCSS);
      }
    } else {
      throw new Error(`Import '${id}' not found!`);
    }
  }

  async removeImport (url, options) {
    if (this.importStore.isEnabled(url)) {
      let quickCSS = this.main.moduleManager._quickCSS;
      const importRegExp = new RegExp(`@import url\\(["']?${global._.escapeRegExp(url)}["']?\\).+(\n?)`, 'g');

      if (importRegExp.test(quickCSS)) {
        quickCSS = quickCSS.replaceAll(importRegExp, '');

        await this.main.moduleManager._saveQuickCSS(quickCSS);
      } else {
        throw new Error(`Import '${url}' not found!`);
      }
    }

    if (options?.showToast === true) {
      sendToast.call(this, url, null);
    }

    delete options?.showToast;

    FluxDispatcher.dispatch({
      type: FluxActions.IMPORT_REMOVE,
      options,
      url
    });
  }

  async addImport (url, force = false) {
    if (typeof url !== 'string') {
      return;
    }

    const quickCSS = this.main.moduleManager._quickCSS;
    const $import = this.importStore.getImport(url);

    if (!$import || Boolean(force)) {
      this.main.moduleManager._saveQuickCSS(`@import url('${url}');\n${quickCSS}`);
    } else {
      throw new Error(`Import '${url}' already exists!`);
    }
  }

  async enableImport (url) {
    const $import = this.importStore.getImport(url);
    const enabled = this.importStore.isEnabled(url);

    if ($import && !enabled) {
      await this.addImport(url);

      FluxDispatcher.dispatch({
        type: FluxActions.IMPORT_ENABLE,
        url
      });

      return $import;
    } else {
      throw new Error($import ? `Import '${url}' is already enabled!` : `Import '${url}' not found!`);
    }
  }

  async disableImport (url) {
    const $import = this.importStore.getImport(url);
    const enabled = this.importStore.isEnabled(url);

    if ($import && enabled) {
      await this.removeImport(url, { preserveImport: true });

      FluxDispatcher.dispatch({
        type: FluxActions.IMPORT_DISABLE,
        url
      });

      return $import;
    } else {
      throw new Error($import ? `Import '${url}' is already disabled!` : `Import '${url}' not found!`);
    }
  }

  async toggleImport (url, ...args) {
    const state = typeof args[0] === 'boolean' ? args[0] : !this.importStore.isEnabled(url);
    const options = typeof args[0] === 'object' ? args[0] : args[1] || {};

    if (state === true) {
      await this.enableImport(url);
    } else if (state === false) {
      await this.disableImport(url);
    }

    if (options?.showToast === true) {
      sendToast.call(this, url, state, this.toggleImport.bind(this));
    }
  }
};
