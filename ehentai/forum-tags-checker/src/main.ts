import { GM_openInTab } from '$';
import { toHumanDate } from '@ehentai/lib/utils';

import { checkPosts } from '@/check-tags/tags-checker';
import { renderRoot } from '@/components/root';
import { setupPostAutoSave } from '@/storage/auto-save';
import { loadPosts } from '@/storage/persist-posts';
import { isCreatingPost, isEditingPost } from '@/utils/forum-dom-utils';
import { isStrikedPost } from '@/utils/post-utils';

main();

function main() {
  setupGlobalShortcuts();

  if (isEditingPost() || isCreatingPost()) {
    setupPostAutoSave();
    renderRoot();
  }
}

// function setupPostEditDom() {
//   if (!isTaggingAssistance()) {
//     return;
//   }
//   createCheckTagsButton(async () => {
//     const post = parsePost(getPostText());

//     let strikedTags = 0;
//     let checkedGalleries = 0;
//     let total = 0;

//     const updates = await checkPosts([post], (change) => {
//       switch (change) {
//         case 'checked-gallery':
//           checkedGalleries++;
//           break;
//         case 'striked-tag':
//           strikedTags++;
//           break;
//         case 'increase-total':
//           total++;
//           break;
//       }
//       updateStatus(checkedGalleries, strikedTags, total);
//     });
//     const { checkedPost } = updates[0] ?? { checkedPost: post };
//     setPostText(postToString(checkedPost));
//   });

//   if (!isEditingRequest() || window.location.href.endsWith('index.php?')) {
//     return;
//   }

//   createRenderFromStorageButton();
//   createSubscribeButton();
// }

function setupGlobalShortcuts() {
  document.addEventListener('keyup', (e) => {
    if (e.ctrlKey && e.altKey && e.code === 'Digit1') {
      openPosts();
    }
    if (e.ctrlKey && e.altKey && e.code === 'Digit2') {
      openChangedPosts();
    }
    if (e.ctrlKey && e.altKey && e.code === 'Digit5') {
      openPosts({ isStriked: true });
    }
    if (e.ctrlKey && e.altKey && e.code === 'Digit9') {
      openPosts();
      openPosts({ isStriked: true });
    }
  });
}

function openPosts({ isStriked } = { isStriked: false }) {
  const posts = loadPosts();
  // GM_openInTab() opens in reversed order hence reversing the reversion
  for (const post of posts.slice().reverse()) {
    if (isStrikedPost(post) === isStriked) {
      GM_openInTab(post.href);
    }
  }
}

async function openChangedPosts() {
  const posts = loadPosts();

  console.info(`Checking ${posts.length} posts`);
  const updates = await checkPosts(posts);
  console.info(`Updated ${updates.length} posts`);

  for (const { checkedPost, checkedGalleries, strikedTags } of updates) {
    const message = `Post ${toHumanDate(checkedPost.date)} ${checkedPost.href}
${checkedGalleries} galleries checked 
${strikedTags} tags striked`;
    console.info(message);
    GM_openInTab(checkedPost.href);
  }
}
