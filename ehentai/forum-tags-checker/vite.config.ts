import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tsconfigPaths(),
    preact(),
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Tags Checker',
        namespace: 'https://github.com/sighasset/userscripts/tree/main/ehentai',
        version: '0.2',
        description: 'Utillity to work with downvote requests',
        author: 'sighasset',
        match: ['https://forums.e-hentai.org/*'],
        icon: 'https://www.google.com/s2/favicons?sz=64&domain=forums.e-hentai.org',
        updateURL:
          'https://raw.githubusercontent.com/sighasset/userscripts/main/ehentai/forum-tags-checker/dist/forum-tags-checker.meta.js',
        downloadURL:
          'https://raw.githubusercontent.com/sighasset/userscripts/main/ehentai/forum-tags-checker/dist/forum-tags-checker.user.js',
      },
      build: {
        metaFileName: true,
      },
    }),
  ],
});
