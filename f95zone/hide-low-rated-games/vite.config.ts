import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Hide Low Rated Games',
        namespace: 'https://github.com/sighasset/userscripts/tree/main/f95zone',
        version: '0.1',
        description:
          'Hides search results below the configured rating threshold',
        author: 'sighasset',
        match: ['https://f95zone.to/sam/latest_alpha/*'],
        icon: 'https://www.google.com/s2/favicons?sz=64&domain=f95zone.to',
        updateURL:
          'https://raw.githubusercontent.com/sighasset/userscripts/refs/heads/main/f95zone/hide-low-rated/dist/hide-low-rated.meta.js',
        downloadURL:
          'https://raw.githubusercontent.com/sighasset/userscripts/refs/heads/main/f95zone/hide-low-rated/dist/hide-low-rated.user.js',
      },
      build: {
        metaFileName: true,
      },
    }),
  ],
});
