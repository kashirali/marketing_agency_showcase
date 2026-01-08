import axios, { AxiosError } from "axios";

/**
 * LinkedIn API Service
 * Handles OAuth 2.0 authentication and posting to LinkedIn
 */

const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";
const LINKEDIN_OAUTH_BASE = "https://www.linkedin.com/oauth/v2";

export interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
}

export interface LinkedInPostRequest {
  content: string;
  title?: string;
  hashtags?: string[];
  imageUrl?: string;
}

export interface LinkedInPostResponse {
  id: string;
  url: string;
  success: boolean;
  message: string;
}

/**
 * Generate LinkedIn OAuth authorization URL
 */
export function generateLinkedInAuthUrl(): string {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error("LinkedIn credentials not configured");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid profile email w_member_social",
    state: generateRandomState(),
  });

  return `${LINKEDIN_OAUTH_BASE}/authorization?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<LinkedInTokenResponse> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("LinkedIn credentials not configured");
  }

  try {
    const response = await axios.post(`${LINKEDIN_OAUTH_BASE}/accessToken`, null, {
      params: {
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return response.data as LinkedInTokenResponse;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("Error exchanging code for token:", axiosError.response?.data);
    throw new Error(`Failed to exchange authorization code: ${axiosError.message}`);
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<LinkedInTokenResponse> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("LinkedIn credentials not configured");
  }

  try {
    const response = await axios.post(`${LINKEDIN_OAUTH_BASE}/accessToken`, null, {
      params: {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return response.data as LinkedInTokenResponse;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("Error refreshing token:", axiosError.response?.data);
    throw new Error(`Failed to refresh access token: ${axiosError.message}`);
  }
}

/**
 * Get LinkedIn user profile information
 */
export async function getUserProfile(accessToken: string): Promise<any> {
  try {
    const response = await axios.get(`${LINKEDIN_API_BASE}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": "202401",
      },
    });

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("Error fetching user profile:", axiosError.response?.data);
    throw new Error(`Failed to fetch user profile: ${axiosError.message}`);
  }
}

/**
 * Post content to LinkedIn as a member
 */
export async function postToLinkedIn(
  accessToken: string,
  request: LinkedInPostRequest
): Promise<LinkedInPostResponse> {
  try {
    const postContent = formatLinkedInPost(request);

    const payload: any = {
      author: "urn:li:person:me",
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.PublishContent": {
          shareCommentary: {
            text: postContent,
          },
          shareMediaCategory: request.imageUrl ? "IMAGE" : "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    if (request.imageUrl) {
      // If we have an image, we need to upload it first and get the URN
      // In a real flow, the caller might pass the URN directly or we upload here
      const assetUrn = await uploadImageToLinkedIn(accessToken, request.imageUrl);
      payload.specificContent["com.linkedin.ugc.PublishContent"].media = [
        {
          status: "READY",
          description: {
            text: request.title || "Post Image",
          },
          media: assetUrn,
          title: {
            text: request.title || "Post Image",
          },
        },
      ];
    }

    const response = await axios.post(`${LINKEDIN_API_BASE}/ugcPosts`, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202401",
      },
    });

    const postId = response.data.id || response.headers["x-linkedin-id"];

    return {
      id: postId,
      url: `https://www.linkedin.com/feed/update/${postId}`,
      success: true,
      message: "Post published successfully to LinkedIn",
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("Error posting to LinkedIn:", axiosError.response?.data);

    return {
      id: "",
      url: "",
      success: false,
      message: `Failed to post to LinkedIn: ${axiosError.message}`,
    };
  }
}

/**
 * Upload an image to LinkedIn and return the asset URN
 */
export async function uploadImageToLinkedIn(
  accessToken: string,
  imageUrl: string
): Promise<string> {
  try {
    // 1. Register the upload
    const registerPayload = {
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: "urn:li:person:me",
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          },
        ],
      },
    };

    const registerResponse = await axios.post(
      `${LINKEDIN_API_BASE}/assets?action=registerUpload`,
      registerPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const uploadUrl = registerResponse.data.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
    const assetUrn = registerResponse.data.value.asset;

    // 2. Download the image from URL and upload to LinkedIn
    const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });

    await axios.post(uploadUrl, imageResponse.data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": imageResponse.headers["content-type"] || "image/jpeg",
      },
    });

    return assetUrn;
  } catch (error) {
    console.error("Error uploading image to LinkedIn:", error);
    throw new Error("Failed to upload image to LinkedIn");
  }
}

/**
 * Post content to LinkedIn organization/company page
 */
export async function postToLinkedInOrganization(
  accessToken: string,
  request: LinkedInPostRequest
): Promise<LinkedInPostResponse> {
  const organizationId = process.env.LINKEDIN_ORGANIZATION_ID;

  if (!organizationId) {
    throw new Error("LinkedIn Organization ID not configured");
  }

  try {
    const postContent = formatLinkedInPost(request);

    const payload = {
      author: `urn:li:organization:${organizationId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.PublishContent": {
          shareCommentary: {
            text: postContent,
          },
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const response = await axios.post(`${LINKEDIN_API_BASE}/ugcPosts`, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202401",
      },
    });

    const postId = response.data.id || response.headers["x-linkedin-id"];

    return {
      id: postId,
      url: `https://www.linkedin.com/feed/update/${postId}`,
      success: true,
      message: "Post published successfully to LinkedIn organization",
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("Error posting to LinkedIn organization:", axiosError.response?.data);

    return {
      id: "",
      url: "",
      success: false,
      message: `Failed to post to LinkedIn organization: ${axiosError.message}`,
    };
  }
}

/**
 * Format LinkedIn post content with title and hashtags
 */
function formatLinkedInPost(request: LinkedInPostRequest): string {
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
 * Generate random state for OAuth
 */
function generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Validate access token expiry
 */
export function isTokenExpired(expiresIn: number, issuedAt: number): boolean {
  const now = Date.now();
  const expiryTime = issuedAt + expiresIn * 1000;

  // Consider token expired if less than 5 minutes remaining
  return now > expiryTime - 5 * 60 * 1000;
}

/**
 * LinkedIn API error handler
 */
export function handleLinkedInError(error: any): string {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.message) {
    return error.message;
  }

  return "Unknown error occurred";
}
