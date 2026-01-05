import { invokeLLM } from "../_core/llm";

export interface ContentGenerationRequest {
  agencyName: string;
  services: string[];
  tone: "professional" | "casual" | "energetic" | "educational";
  platform: "linkedin" | "facebook" | "twitter" | "instagram";
  includeHashtags: boolean;
  style?: string;
  recentAchievements?: string[];
}

export interface GeneratedContent {
  title: string;
  content: string;
  hashtags: string[];
  platform: string;
}

/**
 * Generate social media content using LLM based on agency information
 * Tailors content for each platform with appropriate length and tone
 */
export async function generateSocialMediaContent(
  request: ContentGenerationRequest
): Promise<GeneratedContent> {
  const platformGuidelines = getPlatformGuidelines(request.platform);
  const toneInstructions = getToneInstructions(request.tone);

  const systemPrompt = `You are a professional social media content creator for digital marketing agencies. 
Your task is to create engaging, authentic social media posts that showcase the agency's expertise and drive engagement.
${toneInstructions}

Platform: ${request.platform}
${platformGuidelines.instructions}

Agency: ${request.agencyName}
Services: ${request.services.join(", ")}
${request.recentAchievements ? `Recent Achievements: ${request.recentAchievements.join(", ")}` : ""}
${request.style ? `Content Style: ${request.style}` : ""}`;

  const userPrompt = `Generate a social media post for ${request.platform} that:
1. Highlights one of these services: ${request.services.join(", ")}
2. Is engaging and drives interaction
3. Includes a clear call-to-action
4. Follows the character limit of ${platformGuidelines.maxLength} characters
${request.includeHashtags ? "5. Includes relevant hashtags" : ""}

Respond in JSON format with the following structure:
{
  "title": "A catchy title or headline (optional, mainly for LinkedIn)",
  "content": "The main post content",
  "hashtags": ["hashtag1", "hashtag2", ...] or []
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "social_media_post",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Optional title or headline" },
              content: { type: "string", description: "Main post content" },
              hashtags: {
                type: "array",
                items: { type: "string" },
                description: "List of relevant hashtags",
              },
            },
            required: ["content", "hashtags"],
            additionalProperties: false,
          },
        },
      },
    });

    const responseContent = response.choices[0]?.message.content;
    if (!responseContent) {
      throw new Error("No response from LLM");
    }

    const responseText = typeof responseContent === "string" ? responseContent : (Array.isArray(responseContent) && responseContent[0]?.type === "text" ? (responseContent[0] as any).text : "");
    const parsed = JSON.parse(responseText);

    return {
      title: parsed.title || "",
      content: parsed.content,
      hashtags: parsed.hashtags || [],
      platform: request.platform,
    };
  } catch (error) {
    console.error("Error generating social media content:", error);
    throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Generate multiple variations of content for A/B testing
 */
export async function generateContentVariations(
  request: ContentGenerationRequest,
  count: number = 3
): Promise<GeneratedContent[]> {
  const variations: GeneratedContent[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const variation = await generateSocialMediaContent({
        ...request,
        // Slightly vary the tone/style for each variation
        style: request.style ? `${request.style} (Variation ${i + 1})` : undefined,
      });
      variations.push(variation);
    } catch (error) {
      console.error(`Failed to generate variation ${i + 1}:`, error);
    }
  }

  return variations;
}

/**
 * Generate a weekly content calendar
 */
export async function generateWeeklyContentCalendar(
  request: ContentGenerationRequest,
  daysOfWeek: number[] = [1, 2, 3, 4, 5] // Monday to Friday
): Promise<Map<number, GeneratedContent[]>> {
  const calendar = new Map<number, GeneratedContent[]>();

  for (const day of daysOfWeek) {
    try {
      const dayContent = await generateContentVariations(request, 1);
      calendar.set(day, dayContent);
    } catch (error) {
      console.error(`Failed to generate content for day ${day}:`, error);
    }
  }

  return calendar;
}

/**
 * Get platform-specific guidelines
 */
function getPlatformGuidelines(platform: string): {
  maxLength: number;
  instructions: string;
} {
  const guidelines: Record<
    string,
    { maxLength: number; instructions: string }
  > = {
    linkedin: {
      maxLength: 3000,
      instructions:
        "LinkedIn posts should be professional, thought-provoking, and include industry insights. Use line breaks for readability. Include a clear value proposition.",
    },
    facebook: {
      maxLength: 2000,
      instructions:
        "Facebook posts should be conversational and engaging. Include a question or call-to-action to encourage comments. Can be more casual than LinkedIn.",
    },
    twitter: {
      maxLength: 280,
      instructions:
        "Twitter posts must be concise and impactful. Use relevant hashtags. Include a link or call-to-action. Keep it punchy and memorable.",
    },
    instagram: {
      maxLength: 2200,
      instructions:
        "Instagram captions should be visually descriptive and engaging. Use emojis sparingly. Include a call-to-action. Focus on storytelling and visual appeal.",
    },
  };

  return (
    guidelines[platform] || {
      maxLength: 1000,
      instructions: "Create engaging social media content.",
    }
  );
}

/**
 * Get tone-specific instructions
 */
function getToneInstructions(tone: string): string {
  const tones: Record<string, string> = {
    professional:
      "Use formal language, industry terminology, and maintain a business-focused tone. Avoid slang or overly casual language.",
    casual:
      "Use conversational language, relatable examples, and a friendly tone. Make it feel like talking to a colleague.",
    energetic:
      "Use exclamation marks, dynamic language, and enthusiasm. Create urgency and excitement around the message.",
    educational:
      "Focus on teaching and providing value. Include tips, insights, or actionable advice. Position the agency as a thought leader.",
  };

  return tones[tone] || tones.professional;
}

/**
 * Generate hashtag suggestions based on content and platform
 */
export async function generateHashtags(
  content: string,
  platform: string,
  agencyServices: string[]
): Promise<string[]> {
  const systemPrompt = `You are a social media expert specializing in hashtag strategy.
Generate relevant, trending hashtags for ${platform} that will increase visibility and engagement.
Consider industry trends, the agency's services (${agencyServices.join(", ")}), and the content theme.`;

  const userPrompt = `Generate 8-12 relevant hashtags for this ${platform} post:
"${content}"

Respond with ONLY a JSON array of hashtags (strings starting with #), no other text.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const responseContent = response.choices[0]?.message.content;
    if (!responseContent) {
      return [];
    }

    const responseText = typeof responseContent === "string" ? responseContent : (Array.isArray(responseContent) && responseContent[0]?.type === "text" ? (responseContent[0] as any).text : "");
    const hashtags = JSON.parse(responseText);
    return Array.isArray(hashtags) ? hashtags : [];
  } catch (error) {
    console.error("Error generating hashtags:", error);
    return [];
  }
}
