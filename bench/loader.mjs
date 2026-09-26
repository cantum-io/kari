import fs from 'node:fs';
const src = fs.readFileSync('node_modules/signalsmith-stretch/SignalsmithStretch.mjs', 'utf8');
const cut = src.indexOf('function registerWorkletProcessor');
const body = src.slice(0, cut).replace(/^let module = \{\}, exports = \{\};/, '');
// eslint-disable-next-line no-new-func
const factory = new Function('module', 'exports', body + '\nreturn SignalsmithStretch;')({}, {});
export default factory;
