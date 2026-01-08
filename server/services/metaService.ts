import axios, { AxiosError } from "axios";

/**
 * Meta Graph API Service
 * Handles Facebook and Instagram posting via Meta's Graph API
 */

const FACEBOOK_API_BASE = "https://graph.facebook.com/v18.0";
const INSTAGRAM_API_BASE = "https://graph.instagram.com/v18.0";

export interface MetaPostRequest {
  content: string;
  title?: string;
  hashtags?: string[];
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: "image" | "video" | "carousel";
}

export interface MetaPostResponse {
  id: string;
  url: string;
  success: boolean;
  message: string;
}

export interface FacebookPostRequest extends MetaPostRequest {
  link?: string;
  picture?: string;
  name?: string;
  description?: string;
}

export interface InstagramPostRequest extends MetaPostRequest {
  carouselItems?: Array<{
    imageUrl?: string;
    videoUrl?: string;
  }>;
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
  tasks: string[];
}

export interface InstagramAccount {
  id: string;
  username?: string;
  name?: string;
}

/**
 * Post to Facebook page
 */
export async function postToFacebook(
  accessToken: string,
  pageId: string,
  request: FacebookPostRequest
): Promise<MetaPostResponse> {
  if (!pageId || !accessToken) {
    throw new Error("Facebook credentials missing");
  }

  try {
    const payload: any = {
      message: formatFacebookPost(request),
      access_token: accessToken,
    };

    // Add link if provided
    if (request.link) {
      payload.link = request.link;
    }

    // Add picture if provided
    if (request.picture) {
      payload.picture = request.picture;
    }

    // Add name and description for link posts
    if (request.name) {
      payload.name = request.name;
    }

    if (request.description) {
      payload.description = request.description;
    }

    const response = await axios.post(`${FACEBOOK_API_BASE}/${pageId}/feed`, payload);

    const postId = response.data.id;

    return {
      id: postId,
      url: `https://www.facebook.com/${pageId}/posts/${postId}`,
      success: true,
      message: "Post published successfully to Facebook",
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("Error posting to Facebook:", axiosError.response?.data);

    return {
      id: "",
      url: "",
      success: false,
      message: `Failed to post to Facebook: ${axiosError.message}`,
    };
  }
}

/**
 * Post image to Instagram
 */
export async function postImageToInstagram(
  accessToken: string,
  accountId: string,
  request: InstagramPostRequest
): Promise<MetaPostResponse> {
  if (!accountId || !accessToken || !request.imageUrl) {
    throw new Error("Instagram credentials or image URL missing");
  }

  try {
    const payload = {
      image_url: request.imageUrl,
      caption: formatInstagramCaption(request),
      access_token: accessToken,
    };

    const response = await axios.post(
      `${INSTAGRAM_API_BASE}/${accountId}/media`,
      payload
    );

    const mediaId = response.data.id;

    // Publish the media
    await axios.post(
      `${INSTAGRAM_API_BASE}/${mediaId}/publish`,
      { access_token: accessToken }
    );

    return {
      id: mediaId,
      url: `https://instagram.com/p/${mediaId}`,
      success: true,
      message: "Image published successfully to Instagram",
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("Error posting image to Instagram:", axiosError.response?.data);

    return {
      id: "",
      url: "",
      success: false,
      message: `Failed to post image to Instagram: ${axiosError.message}`,
    };
  }
}

/**
 * Post video to Instagram
 */
export async function postVideoToInstagram(
  accessToken: string,
  accountId: string,
  request: InstagramPostRequest
): Promise<MetaPostResponse> {
  if (!accountId || !accessToken || !request.videoUrl) {
    throw new Error("Instagram credentials or video URL missing");
  }

  try {
    const payload = {
      media_type: "VIDEO",
      video_url: request.videoUrl,
      caption: formatInstagramCaption(request),
      access_token: accessToken,
    };

    const response = await axios.post(
      `${INSTAGRAM_API_BASE}/${accountId}/media`,
      payload
    );

    const mediaId = response.data.id;

    // Publish the media
    await axios.post(
      `${INSTAGRAM_API_BASE}/${mediaId}/publish`,
      { access_token: accessToken }
    );

    return {
      id: mediaId,
      url: `https://instagram.com/p/${mediaId}`,
      success: true,
      message: "Video published successfully to Instagram",
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("Error posting video to Instagram:", axiosError.response?.data);

    return {
      id: "",
      url: "",
      success: false,
      message: `Failed to post video to Instagram: ${axiosError.message}`,
    };
  }
}

/**
 * Post carousel (multiple images) to Instagram
 */
export async function postCarouselToInstagram(
  accessToken: string,
  accountId: string,
  request: InstagramPostRequest
): Promise<MetaPostResponse> {
  if (!accountId || !accessToken || !request.carouselItems || request.carouselItems.length === 0) {
    throw new Error("Instagram credentials or carousel items missing");
  }

  try {
    // Create individual media items first
    const childrenIds: string[] = [];

    for (const item of request.carouselItems) {
      const childPayload: any = {
        access_token: accessToken,
      };

      if (item.imageUrl) {
        childPayload.image_url = item.imageUrl;
      } else if (item.videoUrl) {
        childPayload.media_type = "VIDEO";
        childPayload.video_url = item.videoUrl;
      }

      const childResponse = await axios.post(
        `${INSTAGRAM_API_BASE}/${accountId}/media`,
        childPayload
      );

      childrenIds.push(childResponse.data.id);
    }

    // Create carousel container
    const carouselPayload = {
      media_type: "CAROUSEL",
      children: childrenIds,
      caption: formatInstagramCaption(request),
      access_token: accessToken,
    };

    const response = await axios.post(
      `${INSTAGRAM_API_BASE}/${accountId}/media`,
      carouselPayload
    );

    const mediaId = response.data.id;

    // Publish the carousel
    await axios.post(
      `${INSTAGRAM_API_BASE}/${mediaId}/publish`,
      { access_token: accessToken }
    );

    return {
      id: mediaId,
      url: `https://instagram.com/p/${mediaId}`,
      success: true,
      message: "Carousel published successfully to Instagram",
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("Error posting carousel to Instagram:", axiosError.response?.data);

    return {
      id: "",
      url: "",
      success: false,
      message: `Failed to post carousel to Instagram: ${axiosError.message}`,
    };
  }
}

/**
 * Get Instagram insights
 */
export async function getInstagramInsights(): Promise<any> {
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!accountId || !accessToken) {
    throw new Error("Instagram credentials not configured");
  }

  try {
    const response = await axios.get(
      `${INSTAGRAM_API_BASE}/${accountId}/insights`,
      {
        params: {
          metric: "impressions,reach,profile_views",
          access_token: accessToken,
        },
      }
    );

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("Error fetching Instagram insights:", axiosError.response?.data);
    throw error;
  }
}

/**
 * Get Facebook page insights
 */
export async function getFacebookInsights(): Promise<any> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    throw new Error("Facebook credentials not configured");
  }

  try {
    const response = await axios.get(
      `${FACEBOOK_API_BASE}/${pageId}/insights`,
      {
        params: {
          metric: "page_impressions,page_fans,page_engaged_users",
          access_token: accessToken,
        },
      }
    );

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("Error fetching Facebook insights:", axiosError.response?.data);
    throw error;
  }
}

/**
 * Format Facebook post content
 */
function formatFacebookPost(request: FacebookPostRequest): string {
  let content = "";

  if (request.title) {
    content += `${request.title}\n\n`;
  }

  content += request.content;

  if (request.hashtags && request.hashtags.length > 0) {
    content += "\n\n";
    content += request.hashtags.join(" ");
  }

  return content;
}

/**
 * Format Instagram caption
 */
function formatInstagramCaption(request: InstagramPostRequest): string {
  let caption = request.content;

  if (request.hashtags && request.hashtags.length > 0) {
    caption += "\n\n";
    caption += request.hashtags.join(" ");
  }

  // Instagram has a 2200 character limit for captions
  if (caption.length > 2200) {
    caption = caption.substring(0, 2197) + "...";
  }

  return caption;
}

/**
 * Handle Meta API errors
 */
export function handleMetaError(error: any): string {
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.message) {
    return error.message;
  }

  return "Unknown error occurred";
}

/**
 * Exchange OAuth code for short-lived access token
 */
export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const clientId = process.env.META_CLIENT_ID;
  const clientSecret = process.env.META_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Meta client credentials missing");
  }

  try {
    const response = await axios.get(`${FACEBOOK_API_BASE}/oauth/access_token`, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      },
    });

    return response.data.access_token;
  } catch (error) {
    console.error("Error exchanging code for token:", (error as any).response?.data || (error as any).message);
    throw new Error(`Failed to exchange Meta code: ${handleMetaError(error)}`);
  }
}

/**
 * Exchange short-lived token for long-lived token
 */
export async function exchangeTokenForLongLived(shortLivedToken: string): Promise<string> {
  const clientId = process.env.META_CLIENT_ID;
  const clientSecret = process.env.META_CLIENT_SECRET;

  try {
    const response = await axios.get(`${FACEBOOK_API_BASE}/oauth/access_token`, {
      params: {
        grant_type: "fb_exchange_token",
        client_id: clientId,
        client_secret: clientSecret,
        fb_exchange_token: shortLivedToken,
      },
    });

    return response.data.access_token;
  } catch (error) {
    console.error("Error extending token:", (error as any).response?.data || (error as any).message);
    return shortLivedToken; // Fallback to short-lived
  }
}

/**
 * Get Facebook pages associated with a user token (with pagination)
 */
export async function getFacebookPages(accessToken: string): Promise<FacebookPage[]> {
  try {
    let allPages: FacebookPage[] = [];
    let nextUrl: string | null = `${FACEBOOK_API_BASE}/me/accounts?access_token=${accessToken}&fields=id,name,access_token,category,tasks&limit=100`;

    while (nextUrl) {
      const response: any = await axios.get(nextUrl);
      const data = response.data.data || [];
      allPages = [...allPages, ...data];
      nextUrl = response.data.paging?.next || null;
    }

    // Filter out pages that don't have an access_token (though they usually do if returned here)
    return allPages.filter(page => !!page.access_token);
  } catch (error) {
    console.error("Error fetching Facebook pages:", (error as any).response?.data || (error as any).message);
    throw new Error(`Failed to fetch Facebook pages: ${handleMetaError(error)}`);
  }
}

/**
 * Get Instagram business account linked to a Facebook page
 */
export async function getInstagramBusinessAccount(pageId: string, accessToken: string): Promise<InstagramAccount | null> {
  try {
    const response = await axios.get(`${FACEBOOK_API_BASE}/${pageId}`, {
      params: {
        fields: "instagram_business_account{id,username,name}",
        access_token: accessToken,
      },
    });

    return response.data.instagram_business_account || null;
  } catch (error) {
    console.error(`Error fetching IG account for page ${pageId}:`, (error as any).response?.data || (error as any).message);
    return null;
  }
}

/**
 * Validate access token
 */
export async function validateAccessToken(accessToken: string): Promise<boolean> {
  try {
    const response = await axios.get(
      `${FACEBOOK_API_BASE}/me`,
      {
        params: {
          access_token: accessToken,
        },
      }
    );

    return response.status === 200;
  } catch (error) {
    console.error("Error validating access token:", error);
    return false;
  }
}
