import { render } from 'preact';

import { App } from '@/components/app';

import styles from './root.module.css';

export function renderRoot() {
  const parent = document.querySelector(
    '.darkrow3 > tbody > tr > td:nth-child(2)',
  );
  if (!parent) {
    console.error('Couldnt query parent for tags checker');
    return;
  }

  const root = document.createElement('div');
  root.className = styles.root;
  parent.appendChild(root);

  render(<App />, root);
}
