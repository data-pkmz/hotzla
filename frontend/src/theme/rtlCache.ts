import createCache from '@emotion/cache';
<<<<<<< HEAD
import rtlPlugin from 'stylis-plugin-rtl';

// Compatibility resolution for stylis-plugin-rtl under both ESM and CJS bundlers
const resolvedRtlPlugin =
  typeof rtlPlugin === 'function'
    ? rtlPlugin
    : (rtlPlugin as unknown as { default: typeof rtlPlugin })?.default || rtlPlugin;

// יצירת Cache עבור Emotion שממיר CSS לכיוון מימין-לשמאל (RTL)
export const rtlCache = createCache({
  key: 'muirtl',
  stylisPlugins: [resolvedRtlPlugin],
=======
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';

// יצירת Cache עבור Emotion שממיר CSS לכיוון מימין-לשמאל (RTL)
export const rtlCache = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
>>>>>>> 8a3a984 (feat: add initial layout components and RTL cache)
});
