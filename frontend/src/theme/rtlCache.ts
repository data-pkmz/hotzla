import createCache from '@emotion/cache';
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
});
