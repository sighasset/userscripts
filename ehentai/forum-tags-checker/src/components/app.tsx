import { toHumanDate } from '@ehentai/lib/utils';
import { useState } from 'preact/hooks';

import { parsePost, postToString } from '@/check-tags/post-parser';
import { checkPosts } from '@/check-tags/tags-checker';
import PostInfo from '@/components/post-info';
import { loadPost } from '@/storage/persist-posts';
import { Post } from '@/types';
import {
  getPostHref,
  getPostText,
  isEditingPost,
  setPostText,
} from '@/utils/forum-dom-utils';

import styles from './app.module.css';

// todo: type shouldnt be here
type CheckProgress = {
  total: number;
  checked: number;
};

export function App() {
  const [post, setPost] = useState<Post | null>(() =>
    isEditingPost() ? loadPost(getPostHref()) : null,
  );
  const [checkProgress, setCheckProgress] = useState<CheckProgress | null>(
    null,
  );

  const updatePost = (post: Post) => {
    setPostText(postToString(post));
    setPost(post);
  };

  const handleCheckTags = async () => {
    setCheckProgress({ total: 0, checked: 0 });
    try {
      const parsed = parsePost(getPostText(), post?.href, post?.date);

      const updates = await checkPosts([parsed], (change) => {
        switch (change) {
          case 'checked-gallery':
            setCheckProgress((prev) => {
              prev ??= { total: 0, checked: 0 };
              return { ...prev, checked: prev.checked + 1 };
            });
            break;
          case 'increase-total':
            setCheckProgress((prev) => {
              prev ??= { total: 0, checked: 0 };
              return { ...prev, total: prev.total + 1 };
            });
            break;
        }
      });

      const { checkedPost } = updates[0] ?? { checkedPost: post };
      updatePost(checkedPost);
    } catch (e) {
      console.error(e);
    } finally {
      setCheckProgress(null);
    }
  };

  return (
    <>
      <div class={styles.header}>
        <h4>{post ? `Post: ${toHumanDate(post.date)}` : 'No post info'}</h4>
        <div class={styles.headerRight}>
          {checkProgress && (
            <progress value={checkProgress.checked} max={checkProgress.total} />
          )}
          <button
            onClick={handleCheckTags}
            type={'button'}
            class={styles.checkButton}
          >
            Check tags{' '}
            {checkProgress && checkProgress.checked !== checkProgress.total && (
              <span class={styles.spinner} />
            )}
          </button>
        </div>
      </div>
      {post && <PostInfo post={post} />}
    </>
  );
}
