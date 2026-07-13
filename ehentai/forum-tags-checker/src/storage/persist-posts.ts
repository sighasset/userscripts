import { isTagLine, Post } from '@/types';

const POSTS_STORAGE_KEY = 'downvote_posts';

export function loadPosts(): Post[] {
  return JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || '[]');
}

export function loadPost(href: string): Post | null {
  return loadPosts().find((p) => p.href === href) ?? null;
}

function savePosts(posts: Post[]) {
  localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
}

export function equalsPosts(a: Post, b: Post) {
  return a.href === b.href;
}

export function includesPost(posts: Post[], post: Post) {
  return posts.some((p) => equalsPosts(p, post));
}

export function saveOrUpdatePost(post: Post): Post {
  if (
    post.galleries.some((g) =>
      g.lines
        .filter(isTagLine)
        .some((l) => l.tags.some((t) => t.name.includes('present'))),
    )
  ) {
    // this is a crutch to prevent incorrect post parsing
    alert("post has 'present' tag");
    throw new Error('post has "present" tag');
  }

  const posts = loadPosts();
  const index = posts.findIndex((p) => equalsPosts(p, post));
  if (index === -1) {
    posts.push(post);
    console.info('created post\n', post);
  } else {
    const updated: Post = {
      ...posts[index],
      galleries: post.galleries,
      opener: post.opener,
    };
    posts[index] = updated;
    console.info('updated post\n', post);
  }
  savePosts(posts);
  return posts.find((p) => equalsPosts(p, post))!;
}

export function deletePost(post: Post) {
  const posts = loadPosts();
  const index = posts.findIndex((p) => equalsPosts(p, post));
  if (index === -1) {
    console.error('post not found in storage', post);
    return;
  }
  posts.splice(index, 1);
  savePosts(posts);
}
