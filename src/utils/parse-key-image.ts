import { KeyImage } from "@/types/single-offer";

const epicLegacyVideoProtocol = "com.epicgames.video://";
const epicQuickSilverVideoProtocol = "com.epicgames.video.qs://";
const staticVideoHash = "comepicgamesvideomd5hashconstant";
const placeholderVideoCoverUrl = "https://cdn.egdata.app/placeholder-1080.webp";

export type ParsedKeyImage = ParsedImageKeyImage | ParsedVideoKeyImage;

export interface ParsedImageKeyImage {
  mediaType: "image";
  type: string;
  md5: string;
  imageUrl: string;
}

export interface ParsedVideoKeyImage {
  mediaType: "video";
  type: string;
  md5: string;
  videoId: string;
  coverUrl: string;
}

export const parseKeyImage = (keyImage: KeyImage): ParsedKeyImage => {
  if (
    keyImage.md5 === staticVideoHash &&
    URL.canParse(keyImage.url) &&
    (keyImage.url.startsWith(epicLegacyVideoProtocol) ||
      keyImage.url.startsWith(epicQuickSilverVideoProtocol))
  ) {
    const parsedUrl = new URL(keyImage.url);
    const coverUrl = parsedUrl.searchParams.get("cover");
    const videoId = parsedUrl.host;

    return {
      mediaType: "video",
      type: keyImage.type,
      md5: videoId,
      videoId,
      coverUrl: coverUrl || placeholderVideoCoverUrl,
    };
  }

  return {
    mediaType: "image",
    type: keyImage.type,
    imageUrl: keyImage.url,
    md5: keyImage.md5,
  };
};
