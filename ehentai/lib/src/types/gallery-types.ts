import { Namespace } from './namespace-types';

export type GalleryId = [id: number, token: string];

export type GalleryData = {
  id: GalleryId;
  href: string;
  title: string;
  titleJpn: string;
  category: string;
  thumb: string;
  uploader: string;
  posted: number;
  expunged: boolean;
  rating: number;
  tags: GalleryTag[];
};

export type GalleryTag = {
  namespace: Namespace;
  name: string;
};

export type ScrapedGalleryData = {
  id: GalleryId;
  href: string;
  tags: GalleryTag[];
};

export type VoteType = 'none' | 'up' | 'down';

export type ScrapedGalleryTag = GalleryTag & {
  vote: VoteType;
};
