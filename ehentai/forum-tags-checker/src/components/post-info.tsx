import { Post } from '@/types';
import { getPostGalleriesCount, getPostTagsCount } from '@/utils/post-utils';

export default function PostInfo({ post }: { post: Post }) {
  const { strikedGalleries, totalGalleries } = getPostGalleriesCount(post);
  const { strikedTags, totalTags } = getPostTagsCount(post);

  return (
    <div>
      <div>
        Striked {strikedGalleries}/{totalGalleries} galleries
      </div>
      <div>
        Striked {strikedTags}/{totalTags} tags
      </div>
    </div>
  );
}
