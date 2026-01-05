# BinaryKode AI Social Media Posting Agent

This system provides an intelligent AI agent that automatically generates and schedules daily social media posts for your digital marketing agency. The agent uses advanced LLM technology to create platform-specific, engaging content tailored to your agency's services and branding.

## Features

- **AI-Powered Content Generation**: Uses LLM to generate unique, engaging social media posts
- **Multi-Platform Support**: Generates content optimized for LinkedIn, Facebook, Twitter, and Instagram
- **Intelligent Scheduling**: Automatically schedules posts for optimal posting times
- **Content Variations**: Generate multiple variations of content for A/B testing
- **Platform-Specific Optimization**: Tailors content length, tone, and style for each platform
- **Hashtag Generation**: Automatically generates relevant hashtags for increased visibility
- **Posting History**: Tracks all generated posts and publishing attempts
- **Performance Metrics**: Monitor engagement and posting statistics

## Architecture

The system consists of several key components:

### Database Schema

**Tables:**
- `users` - User authentication and profile data
- `ai_agent_config` - Agent configuration and scheduling settings
- `social_media_accounts` - Connected social media accounts and credentials
- `generated_posts` - AI-generated posts awaiting scheduling or publishing
- `posting_logs` - History of posting attempts and results
- `content_templates` - Reusable content templates for the AI agent

### Backend Services

**`server/services/aiContentGenerator.ts`**
- Generates platform-specific social media content using LLM
- Supports multiple tones: professional, casual, energetic, educational
- Creates content variations for A/B testing
- Generates relevant hashtags

**`server/services/scheduledPostingService.ts`**
- Executes the daily posting job
- Manages post scheduling and publishing
- Tracks posting statistics and history
- Handles error logging and retry logic

### API Endpoints (tRPC)

**AI Agent Router** (`server/routers/aiAgent.ts`)

- `aiAgent.initializeAgent` - Set up the AI agent with agency information
- `aiAgent.getConfig` - Retrieve current agent configuration
- `aiAgent.updateConfig` - Update agent settings
- `aiAgent.generateContent` - Generate content for a specific platform
- `aiAgent.generateVariations` - Generate multiple content variations
- `aiAgent.getPosts` - Retrieve generated posts with filtering
- `aiAgent.schedulePost` - Schedule a post for publishing
- `aiAgent.deletePost` - Delete a generated post

## Getting Started

### 1. Initialize the AI Agent

First, set up your AI agent with your agency information:

```typescript
const response = await trpc.aiAgent.initializeAgent.mutate({
  agentName: "BinaryKode Daily Poster",
  platforms: ["linkedin", "facebook", "twitter", "instagram"],
  postingTime: "09:00", // 9 AM UTC
  timezone: "UTC",
  contentStyle: "Professional yet approachable, data-driven insights",
  agencyInfo: {
    name: "BinaryKode",
    services: [
      "Web Design & Development",
      "Mobile App Development",
      "AI Automation",
      "Chat Bots",
      "Graphic Design",
      "Digital Marketing"
    ],
    description: "Transform Your Business with Technology Solutions",
    achievements: [
      "500+ Happy Clients",
      "1000+ Projects Completed",
      "250% Average ROI",
      "98% Client Retention"
    ]
  }
});
```

### 2. Generate Content

Generate AI-powered content for your platforms:

```typescript
// Generate single post
const post = await trpc.aiAgent.generateContent.mutate({
  platform: "linkedin",
  tone: "professional"
});

// Generate variations for A/B testing
const variations = await trpc.aiAgent.generateVariations.mutate({
  platform: "facebook",
  count: 3,
  tone: "energetic"
});
```

### 3. Schedule Posts

Schedule generated posts for publishing:

```typescript
const scheduledTime = new Date();
scheduledTime.setHours(9, 0, 0, 0); // 9 AM

await trpc.aiAgent.schedulePost.mutate({
  postId: 123,
  scheduledAt: scheduledTime
});
```

### 4. Set Up Daily Automation

Configure the daily posting job to run automatically:

**Option A: Manual Execution**
```bash
node server/jobs/dailyPostingJob.mjs
```

**Option B: Cron Job (Linux/Mac)**
Add to crontab:
```bash
0 8 * * * cd /path/to/project && node server/jobs/dailyPostingJob.mjs
```

**Option C: Windows Task Scheduler**
Create a scheduled task that runs:
```
node C:\path\to\project\server\jobs\dailyPostingJob.mjs
```

## Content Generation

### Supported Platforms

1. **LinkedIn**
   - Max length: 3,000 characters
   - Tone: Professional, thought-provoking
   - Focus: Industry insights, case studies, thought leadership

2. **Facebook**
   - Max length: 2,000 characters
   - Tone: Conversational, engaging
   - Focus: Community building, questions, engagement

3. **Twitter**
   - Max length: 280 characters
   - Tone: Concise, impactful
   - Focus: Quick tips, links, trending topics

4. **Instagram**
   - Max length: 2,200 characters
   - Tone: Visual storytelling
   - Focus: Behind-the-scenes, visual appeal, emojis

### Tone Options

- **Professional**: Formal language, industry terminology, business-focused
- **Casual**: Conversational, relatable, friendly
- **Energetic**: Exclamation marks, dynamic language, urgency
- **Educational**: Teaching, tips, actionable advice, thought leadership

## Customization

### Content Style

Customize how the AI generates content by setting the `contentStyle`:

```typescript
contentStyle: "Focus on case studies and client success stories with specific metrics"
```

### Agency Information

Keep your agency information up to date:

```typescript
agencyInfo: {
  name: "Your Agency Name",
  services: ["Service 1", "Service 2", ...],
  description: "Your agency description",
  achievements: ["Achievement 1", "Achievement 2", ...]
}
```

### Posting Schedule

Configure when posts are generated and scheduled:

```typescript
postingSchedule: {
  time: "09:00",           // Posting time (HH:mm format)
  timezone: "UTC",         // Timezone
  daysOfWeek: [1,2,3,4,5]  // Monday to Friday (0=Sunday, 6=Saturday)
}
```

## Monitoring

### View Posting Statistics

```typescript
const stats = await getPostingStats(userId);
// Returns: {
//   totalGenerated: 50,
//   totalScheduled: 10,
//   totalPublished: 35,
//   totalFailed: 5,
//   platformBreakdown: { linkedin: 15, facebook: 12, twitter: 18, instagram: 5 }
// }
```

### Check Posting Logs

```typescript
const logs = await db
  .select()
  .from(postingLogs)
  .where(eq(postingLogs.userId, userId));
```

## API Integration (Future)

The system is designed to integrate with social media APIs for automatic posting:

### Planned Integrations

- **LinkedIn API**: Post to company pages and personal profiles
- **Facebook Graph API**: Post to pages and groups
- **Twitter API v2**: Post tweets and threads
- **Instagram Graph API**: Post to business accounts

### Adding API Credentials

```typescript
await db.insert(socialMediaAccounts).values({
  userId: 123,
  platform: "linkedin",
  accountName: "Company Page",
  accessToken: "your_access_token",
  accountId: "your_account_id",
  isActive: true
});
```

## Error Handling

The system includes comprehensive error handling:

- **Generation Failures**: Logged and retried
- **Scheduling Errors**: Recorded in posting logs
- **API Errors**: Gracefully handled with detailed error messages
- **Database Errors**: Logged with full context

## Performance Considerations

- Content generation takes 5-15 seconds per post
- Batch operations generate multiple variations efficiently
- Database queries are optimized with proper indexing
- Posting logs are pruned automatically after 90 days

## Troubleshooting

### Posts Not Generating

1. Check agent is active: `aiAgent.getConfig()`
2. Verify agency information is set
3. Check LLM service connectivity
4. Review error logs in `posting_logs` table

### Scheduling Issues

1. Verify posting schedule is configured
2. Check timezone settings
3. Ensure database is accessible
4. Review cron job logs

### Content Quality

1. Adjust `contentStyle` for better results
2. Provide more detailed `achievements`
3. Update `services` list
4. Try different `tone` options

## Best Practices

1. **Regular Updates**: Keep agency information current
2. **Monitor Performance**: Check posting statistics weekly
3. **A/B Testing**: Generate variations and compare performance
4. **Content Review**: Review generated content before publishing
5. **Backup**: Maintain database backups
6. **Scheduling**: Post during peak engagement hours for your audience

## Support

For issues or questions:
- Check the troubleshooting section above
- Review error logs in the database
- Check posting_logs table for detailed error messages
- Contact support@binarykode.com

## Future Enhancements

- Real-time social media API integration
- Advanced analytics and engagement tracking
- AI-powered image generation for posts
- Sentiment analysis and content optimization
- Multi-language support
- Advanced scheduling with timezone support
