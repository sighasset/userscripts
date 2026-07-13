import { API_BATCH_LIMIT, API_RATELIMIT_MS, API_URL } from '../const';
import { GalleryId } from '../types';
import { fetchGalleries } from './api';

vi.mock('./limiter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./limiter')>();
  return {
    ...actual,
    limiter: {
      // Direct pass-through: executes fn immediately and returns its promise
      schedule: vi.fn().mockImplementation((fn) => fn()),
    },
  };
});
const fetchMock = vi.fn();
const originalFetch = global.fetch;

function createGallery(gid: number, token = `token-${gid}`) {
  return {
    gid,
    token,
    title: `title-${gid}`,
    title_jpn: `title-jpn-${gid}`,
    category: 'Manga',
    thumb: `thumb-${gid}`,
    uploader: `uploader-${gid}`,
    posted: 123456,
    filecount: 10,
    filesize: 1000,
    expunged: false,
    rating: 4.5,
    tags: ['artist:test-artist', 'female:test-tag'],
  };
}

function createResponse(
  body: unknown,
  {
    status = 200,
    statusText = 'OK',
  }: {
    status?: number;
    statusText?: string;
  } = {},
) {
  return {
    status,
    statusText,
    json: async () => body,
  };
}

function getRequestBody(callIndex = 0) {
  const [, options] = fetchMock.mock.calls[callIndex];

  if (!options || typeof options !== 'object' || !('body' in options)) {
    throw new Error(`No request body found for fetch call ${callIndex}`);
  }

  return JSON.parse(String(options.body));
}

describe('fetchGalleries', () => {
  beforeAll(() => {
    global.fetch = fetchMock;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('fetches a single batch and returns galleries keyed by gid', async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        gmetadata: [createGallery(1, 'aaa'), createGallery(2, 'bbb')],
      }),
    );

    const result = await fetchGalleries([
      [1, 'aaa'],
      [2, 'bbb'],
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect(fetchMock).toHaveBeenCalledWith(
      API_URL,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );

    expect(result.size).toBe(2);

    expect(result.get(1)).toEqual({
      id: [1, 'aaa'],
      href: 'https://e-hentai.org/g/1/aaa',
      title: 'title-1',
      titleJpn: 'title-jpn-1',
      category: 'Manga',
      thumb: 'thumb-1',
      uploader: 'uploader-1',
      posted: 123456,
      expunged: false,
      rating: 4.5,
      tags: [
        {
          namespace: 'artist:',
          name: 'test-artist',
        },
        {
          namespace: 'female:',
          name: 'test-tag',
        },
      ],
    });
  });

  it('removes duplicate ids before making requests', async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        gmetadata: [createGallery(1, 'aaa')],
      }),
    );

    await fetchGalleries([
      [1, 'aaa'],
      [1, 'aaa'],
      [1, 'aaa'],
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect(getRequestBody().gidlist).toEqual([[1, 'aaa']]);
  });

  it('splits requests into batches of API_BATCH_LIMIT', async () => {
    fetchMock
      .mockResolvedValueOnce(
        createResponse({
          gmetadata: Array.from({ length: API_BATCH_LIMIT }, (_, i) =>
            createGallery(i + 1),
          ),
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          gmetadata: [createGallery(API_BATCH_LIMIT + 1)],
        }),
      );

    const ids: GalleryId[] = Array.from(
      { length: API_BATCH_LIMIT + 1 },
      (_, i) => [i + 1, `token-${i + 1}`] as const,
    );

    const result = await fetchGalleries(ids);

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstBody = getRequestBody(0);
    const secondBody = getRequestBody(1);

    expect(firstBody.gidlist).toHaveLength(API_BATCH_LIMIT);
    expect(secondBody.gidlist).toHaveLength(1);

    expect(firstBody.gidlist[0]).toEqual([1, 'token-1']);
    expect(firstBody.gidlist[24]).toEqual([25, 'token-25']);
    expect(secondBody.gidlist[0]).toEqual([26, 'token-26']);

    expect(result.size).toBe(API_BATCH_LIMIT + 1);
  });

  it('merges results from multiple batches into a single map', async () => {
    fetchMock
      .mockResolvedValueOnce(
        createResponse({
          gmetadata: [createGallery(1), createGallery(2)],
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          gmetadata: [createGallery(3)],
        }),
      );

    const ids: GalleryId[] = Array.from(
      { length: API_BATCH_LIMIT + 1 },
      (_, i) => [i + 1, `token-${i + 1}`] as const,
    );

    const result = await fetchGalleries(ids);

    expect(result.has(1)).toBe(true);
    expect(result.has(2)).toBe(true);
    expect(result.has(3)).toBe(true);
  });

  it('throws when api returns non-200 status', async () => {
    fetchMock.mockResolvedValue(
      createResponse(
        {},
        {
          status: 500,
          statusText: 'Internal Server Error',
        },
      ),
    );

    await expect(fetchGalleries([[1, 'aaa']])).rejects.toThrow(
      'API request failed: Internal Server Error',
    );
  });

  it('throws when response does not contain gmetadata', async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        invalid: true,
      }),
    );

    await expect(fetchGalleries([[1, 'aaa']])).rejects.toThrow(
      'Could not parse API response',
    );
  });

  it('propagates tag parsing errors', async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        gmetadata: [
          {
            ...createGallery(1),
            tags: ['not-a-valid-tag'],
          },
        ],
      }),
    );

    await expect(fetchGalleries([[1, 'aaa']])).rejects.toThrow(
      'Invalid tag string "not-a-valid-tag"',
    );
  });
});
