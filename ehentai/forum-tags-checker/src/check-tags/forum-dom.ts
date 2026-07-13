import { postToString } from '@/check-tags/post-parser';
import { loadPosts } from '@/storage/persist-posts';
import { setPostText } from '@/utils/forum-dom-utils';

const STATUS_ID = 'u-check-status';
export function createRenderFromStorageButton() {
  const parent = getParentBelowTextarea();
  const button = createButtonElement('Render');
  button.style.marginRight = '4px';
  button.onclick = () => {
    const post = loadPosts().find((p) => p.href === window.location.href);
    if (!post) return;

    setPostText(postToString(post));
  };
  parent.appendChild(button);
}

export function createCheckTagsButton(handler: () => void) {
  const parent = getParentBelowTextarea();
  const button = createButtonElement('Check tags');
  button.onclick = handler;
  parent.appendChild(button);
}

function getParentBelowTextarea() {
  return document.querySelector('#checklength')!
    .parentElement as HTMLTableCellElement;
}

function createButtonElement(text: string) {
  const button = document.createElement('input');
  button.type = 'button';
  button.value = text;
  button.className = 'rtebottombutton';
  return button;
}

export function setStatus(status: string) {
  const statusElement = getOrCreateStatusElement();
  statusElement.innerHTML = status;
}

function createStatusElement() {
  const status = document.createElement('div');
  status.id = STATUS_ID;
  const parent = getParentBelowTextarea();
  parent.appendChild(status);
  return status;
}

function getOrCreateStatusElement() {
  const status = document.getElementById(STATUS_ID);
  if (status) return status;
  return createStatusElement();
}

export function updateStatus(checked: number, striked: number, total: number) {
  const status = `Checked <b>${checked}/${total}</b> galleries, striked <b>${striked}</b> tags total`;
  setStatus(status);
}
