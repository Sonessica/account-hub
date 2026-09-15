import { z } from "zod";

const optionalUrl = z.union([z.literal(""), z.string().url().refine((v) => /^https?:\/\//i.test(v), "仅支持 HTTP/HTTPS")]).optional();
export const accountSchema = z.object({
  platformId: z.string().min(1), displayName: z.string().trim().min(1).max(100),
  username: z.string().trim().max(100).optional(), platformUserId: z.string().trim().max(200).optional(),
  avatarUrl: optionalUrl, bio: z.string().trim().max(500).optional(), email: z.union([z.literal(""), z.string().email()]).optional(),
  phone: z.string().trim().max(40).optional(), profileUrl: optionalUrl, loginUrl: optionalUrl, managementUrl: optionalUrl,
  vaultItemHint: z.string().trim().max(100).optional(), notes: z.string().trim().max(2000).optional(), tags: z.string().max(300).optional(),
});
export const setupSchema = z.object({ username: z.string().trim().min(3).max(40), password: z.string().min(12).max(200) });
