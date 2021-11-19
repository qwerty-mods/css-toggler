const { FluxDispatcher, i18n: { Messages } } = require('powercord/webpack');
const { FluxActions } = require('../constants');

let toasts = [];

function sendToast (id, enabled, callback) {
  const statusText = enabled === true ? 'Enabled' : enabled === false ? 'Disabled' : 'Removed';
  const $import = this.importStore.getImport(id, { includeDetails: true });

  const toastId = `css-toggler-${id}-${Math.random().toString(36)}`;
  toasts.push(toastId);

  powercord.api.notices.sendToast(toastId, {
    header: `${statusText} Import`,
    timeout: 5e3,
    content: `You've ${statusText.toLowerCase()} import '${$import.details?.title ? $import.details.title : id}'`,
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
      $import.custom && enabled === null ? null : {
        text: enabled === true ? Messages.DISABLE : enabled === false ? Messages.ENABLE : Messages.JUMP_TO_MESSAGE,
        look: 'ghost',
        size: 'small',
        onClick: () => callback(id)
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
    const importMatches = this.main.moduleManager._quickCSS.matchAll(/@import url\(["']([^"']+)["']\)/g);
    const imports = [ ...importMatches ].map(([ , url ]) => url);

    FluxDispatcher.dirtyDispatch({
      type: FluxActions.IMPORTS_FETCH,
      imports
    });

    return imports;
  }

  toggleCollapse (id) {
    const collapsedImports = getSetting('collapsedImports', []);

    if (collapsedImports.includes(id)) {
      collapsedImports.splice(collapsedImports.indexOf(id), 1);
    } else {
      collapsedImports.push(id);
    }

    updateSetting('collapsedImports', collapsedImports);
  }

  updateImportDetails (id, newDetails) {
    if (typeof newDetails !== 'object') {
      return;
    }

    this.importDetails[id] = {
      title: newDetails.title ?? this.importDetails[id]?.title,
      description: newDetails.description ?? this.importDetails[id]?.description
    };

    if (!this.importDetails[id].title) {
      delete this.importDetails[id].title;
    }

    if (!this.importDetails[id].description) {
      delete this.importDetails[id].description;
    }

    if (!this.importDetails[id].title && !this.importDetails[id].description) {
      delete this.importDetails[id];
    }

    updateSetting('importDetails', this.importDetails);
  }

  async updateImport (id, newUrl) {
    const $import = this.importStore.getImport(id);

    if ($import) {
      if ($import.url === newUrl) {
        return;
      }

      let quickCSS = this.main.moduleManager._quickCSS;
      const match = quickCSS.match(new RegExp(`${global._.escapeRegExp(`@import url\(["']${$import.url}["'])`)}`));

      if (match) {
        const newImport = match[0].replace($import.url, newUrl);

        quickCSS = quickCSS.replace(match[0], newImport);

        await this.main.moduleManager._saveQuickCSS(quickCSS);
      }
    } else {
      throw new Error(`Import '${id}' not found!`);
    }
  }

  async removeImport (id, options) {
    if (this.importStore.isEnabled(id)) {
      let quickCSS = this.main.moduleManager._quickCSS;
      const match = quickCSS.match(new RegExp(`${global._.escapeRegExp(`@import url\(["']${$import.url}["'])`)}`));

      if (match) {
        quickCSS = quickCSS.replace(match[0], '');

        await this.main.moduleManager._saveQuickCSS(quickCSS);
      } else {
        throw new Error(`Import '${id}' not found!`);
      }
    }

    if (options?.showToast === true) {
      sendToast.call(this, id, null);
    }

    delete options?.showToast;

    FluxDispatcher.dirtyDispatch({
      type: FluxActions.IMPORT_REMOVE,
      options,
      id
    });
  }

  addImport (url) {
    if (typeof url !== 'string') {
      return;
    }

    const quickCSS = this.main.moduleManager._quickCSS;
    const $import = this.importStore.getImport(url);

    if (!$import) {
      this.main.moduleManager._saveQuickCSS(`@import url('${url}');\n${quickCSS}`);
    } else {
      throw new Error(`Import '${url}' already exists!`);
    }
  }

  async enableImport (url) {
    const $import = this.importStore.getImport(url);
    const enabled = this.importStore.isEnabled(url);

    if ($import && !enabled) {
      this.addImport(url);

      FluxDispatcher.dirtyDispatch({
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

      FluxDispatcher.dirtyDispatch({
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
