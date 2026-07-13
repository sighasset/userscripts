import { fetchGalleries, scrapeGallery } from '@ehentai/lib/api';
import { getGalleryId, includesTag } from '@ehentai/lib/utils';

import { checkPosts } from '@/check-tags/tags-checker';
import { isTagLine, Post, PostGallery, PostTag } from '@/types';
import { isStrikedGallery } from '@/utils/post-utils';

vi.mock('@ehentai/lib/api', () => ({
  fetchGalleries: vi.fn(),
  scrapeGallery: vi.fn(),
}));

vi.mock('@ehentai/lib/utils', () => ({
  getGalleryId: vi.fn(),
  includesTag: vi.fn(),
}));

vi.mock('@/utils/post-utils', () => ({
  isStrikedGallery: vi.fn(),
}));

const mockedFetchGalleries = vi.mocked(fetchGalleries);
const mockedScrapeGallery = vi.mocked(scrapeGallery);
const mockedGetGalleryId = vi.mocked(getGalleryId);
const mockedIncludesTag = vi.mocked(includesTag);
const mockedIsStrikedGallery = vi.mocked(isStrikedGallery);

function createTag(overrides: Partial<PostTag> = {}): PostTag {
  return {
    namespace: 'female:',
    name: 'tag',
    isStriked: false,
    ...overrides,
  };
}

function createGallery(overrides: Partial<PostGallery> = {}): PostGallery {
  return {
    href: 'gallery-url',
    group: 0,
    info: '',
    lines: [],
    ...overrides,
  };
}

function createPost(galleries: PostGallery[] = []): Post {
  return {
    galleries,
    opener: '',
    href: '',
    date: '',
  };
}

function getPostTag(
  post: Post,
  galleryIndex: number,
  lineIndex: number,
  tagIndex: number,
): PostTag {
  if (!isTagLine(post.galleries[galleryIndex].lines[lineIndex])) {
    throw new Error('expected tag line');
  }

  return post.galleries[galleryIndex].lines[lineIndex].tags[tagIndex];
}

function expectSamePostForm(post: Post, updated: Post): void {
  expect(post.date).toEqual(updated.date);
  expect(post.opener).toEqual(updated.opener);
  expect(post.href).toEqual(updated.href);
  expect(post.galleries.length).toEqual(updated.galleries.length);

  for (let i = 0; i < post.galleries.length; i++) {
    expect(post.galleries[i].lines.length).toEqual(
      updated.galleries[i].lines.length,
    );

    for (let j = 0; j < post.galleries[i].lines.length; j++) {
      const line = post.galleries[i].lines[j];
      const updatedLine = updated.galleries[i].lines[j];

      expect(isTagLine(line)).toEqual(isTagLine(updatedLine));

      if (!isTagLine(line) || !isTagLine(updatedLine)) continue;

      expect(line.tags.length).toEqual(updatedLine.tags.length);
    }
  }
}

describe('checkPosts', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockedGetGalleryId.mockImplementation((href: string) => {
      const id = Number(href.replace('gallery-', ''));
      return [id, 'token'];
    });

    mockedIsStrikedGallery.mockReturnValue(false);

    mockedFetchGalleries.mockResolvedValue(new Map());

    mockedScrapeGallery.mockResolvedValue({
      tags: [],
    } as any);
  });

  it('strikes tags that are missing from fetched and scraped gallery', async () => {
    const tag = createTag();

    const post = createPost([
      createGallery({
        href: 'gallery-1',
        lines: [{ tags: [tag], info: '' }],
      }),
    ]);

    mockedIncludesTag.mockReturnValueOnce(false).mockReturnValueOnce(false);

    const updates = await checkPosts([post]);

    expect(updates).toHaveLength(1);
    expect(updates[0].strikedTags).toBe(1);
    expect(updates[0].checkedGalleries).toBe(1);

    const checkedPost = updates[0].checkedPost;

    expectSamePostForm(post, checkedPost);
    expect(getPostTag(checkedPost, 0, 0, 0).isStriked).toBe(true);

    expect(mockedScrapeGallery).toHaveBeenCalledWith([1, 'token']);
  });

  it('does not strike tags that exist in scraped gallery', async () => {
    const tag = createTag();

    const post = createPost([
      createGallery({
        href: 'gallery-1',
        lines: [{ tags: [tag], info: '' }],
      }),
    ]);

    mockedIncludesTag.mockReturnValueOnce(false).mockReturnValueOnce(true);

    const clonedPost = structuredClone(post);

    const updates = await checkPosts([clonedPost]);

    expect(updates).toHaveLength(0);
    expectSamePostForm(post, clonedPost);
  });

  it('skips tags already marked as striked', async () => {
    const tag = createTag({ isStriked: true });

    const post = createPost([
      createGallery({
        href: 'gallery-1',
        lines: [{ tags: [tag], info: '' }],
      }),
    ]);

    const updates = await checkPosts([post]);

    expect(mockedIncludesTag).not.toHaveBeenCalled();
    expect(mockedScrapeGallery).not.toHaveBeenCalled();
    expect(updates).toHaveLength(0);
  });

  it('skips non-tag lines', async () => {
    const post = createPost([
      createGallery({
        href: 'gallery-1',
        lines: [{ text: 'some text' }],
      }),
    ]);

    const result = await checkPosts([post]);

    expect(mockedIncludesTag).not.toHaveBeenCalled();
    expect(mockedScrapeGallery).not.toHaveBeenCalled();
    expect(result).toHaveLength(0);
  });

  it('skips galleries already considered striked', async () => {
    mockedIsStrikedGallery.mockReturnValue(true);

    const gallery = createGallery({
      href: 'gallery-1',
    });

    const updates = await checkPosts([createPost([gallery])]);

    expect(mockedScrapeGallery).not.toHaveBeenCalled();
    expect(updates).toHaveLength(0);
  });

  it('reuses scraped gallery for multiple tags from same gallery', async () => {
    const post = createPost([
      createGallery({
        href: 'gallery-1',
        lines: [
          {
            info: '',
            tags: [createTag({ name: 'a' }), createTag({ name: 'b' })],
          },
        ],
      }),
    ]);

    mockedIncludesTag.mockReturnValue(false);

    const updates = await checkPosts([post]);

    expect(updates).toHaveLength(1);
    expect(mockedScrapeGallery).toHaveBeenCalledTimes(1);
  });

  it('fetches only ids of non-striked galleries when batch limit is exceeded', async () => {
    mockedIsStrikedGallery.mockReturnValueOnce(false).mockReturnValueOnce(true);

    const posts = [
      createPost([
        createGallery({ href: 'gallery-1' }),
        createGallery({ href: 'gallery-2' }),
      ]),
    ];

    await checkPosts(posts);

    if (mockedFetchGalleries.mock.calls.length > 0) {
      expect(mockedFetchGalleries).toHaveBeenCalledWith([[1, 'token']]);
    }
  });
});
