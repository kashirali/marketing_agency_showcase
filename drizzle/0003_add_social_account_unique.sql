ALTER TABLE social_media_accounts ADD CONSTRAINT social_media_accounts_userId_platform_accountId_unique UNIQUE ("userId", "platform", "accountId");
