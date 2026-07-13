type ApiResponseBaseGallery = {
  gid: number;
  token: string;
  title: string;
  title_jpn: string;
  category: string;
  thumb: string;
  uploader: string;
  posted: number;
  filecount: number;
  filesize: number;
  expunged: boolean;
  rating: number;
  tags: string[];
};

type ApiResponseRelations = {
  parent_gid: number;
  parent_key: string;
  current_gid: number;
  current_key: string;
  first_gid: number;
  first_key: string;
};

export type ApiResponseGallery =
  | ApiResponseBaseGallery
  | (ApiResponseBaseGallery & ApiResponseRelations);

export type ApiResponsePayload = {
  gmetadata: ApiResponseGallery[];
};

export function hasMetadataResponse(
  response: any,
): response is ApiResponsePayload {
  return 'gmetadata' in response;
}
