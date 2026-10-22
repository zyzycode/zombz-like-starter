import { EventEmitter } from 'node:events';
export default {
  Scene: class { constructor() { this.events = new EventEmitter(); } },
  Scenes: { Events: { SHUTDOWN: 'shutdown', DESTROY: 'destroy' } },
  Scale: { Events: { RESIZE: 'resize' } },
  Loader: { Events: { COMPLETE: 'complete', FILE_LOAD_ERROR: 'loaderror' } },
};
