import { downloadFile, promptFile } from '@ehentai/lib/utils';
import { loadPosts, saveOrUpdatePost } from './persist-posts';
import { Post } from '@/types';

const BACKUP_NAME = 'backup-downvote-posts';
const BACKUP_EXT = '.json';

type Backup = {
  posts: Post[];
};

export function downloadBackup() {
  const posts = loadPosts();
  const backup: Backup = {
    posts,
  };
  const content = JSON.stringify(backup);
  downloadFile(BACKUP_NAME + BACKUP_EXT, content);
}

export async function restoreBackup() {
  const file = await promptFile('application/json');
  if (!file) {
    console.warn('no backup file selected');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const content = reader.result as string;
      const backup = JSON.parse(content) as Backup;
      const posts = backup.posts;
      posts.forEach((post) => {
        try {
          saveOrUpdatePost(post);
        } catch (error) {
          console.error('error restoring post', post, error);
        }
      });
    } catch (error) {
      console.error('error parsing backup file', error);
    }
  };
  reader.readAsText(file);
}
