const jsonStore = require('./jsonStore');
const supabaseStore = require('./supabaseStore');

// If STORAGE_DRIVER is explicitly 'json', use jsonStore, otherwise default to supabaseStore (with auto JSON fallback)
const driver = process.env.STORAGE_DRIVER === 'json' ? jsonStore : supabaseStore;

module.exports = {
  readState: driver.readState,
  writeState: driver.writeState,
  updateState: driver.updateState,
  clearState: driver.clearState,
  dataRoot: jsonStore.dataRoot,
};

