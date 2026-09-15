import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const platforms = [
  ["google", "Google", "global", "#4285F4", "https://accounts.google.com/", "https://myaccount.google.com/"],
  ["microsoft", "Microsoft", "global", "#737373", "https://login.live.com/", "https://account.microsoft.com/"],
  ["apple", "Apple", "global", "#111111", "https://account.apple.com/sign-in", "https://account.apple.com/"],
  ["x", "X", "social", "#111111", "https://x.com/i/flow/login", "https://x.com/settings/account"],
  ["xiaohongshu", "小红书", "china", "#FF2442", "https://www.xiaohongshu.com/", "https://www.xiaohongshu.com/"],
  ["zhihu", "知乎", "china", "#1772F6", "https://www.zhihu.com/signin", "https://www.zhihu.com/settings/account"],
  ["qq", "QQ", "china", "#12B7F5", "https://im.qq.com/", "https://id.qq.com/"],
  ["bilibili", "Bilibili", "china", "#FB7299", "https://passport.bilibili.com/login", "https://account.bilibili.com/account/home"],
  ["generic", "其他平台", "manual", "#64748B", null, null],
] as const;

async function main() {
  for (const [key, name, category, color, defaultLoginUrl, defaultManageUrl] of platforms) {
    await prisma.platform.upsert({
      where: { key },
      update: { name, category, color, defaultLoginUrl, defaultManageUrl },
      create: { key, name, category, color, defaultLoginUrl, defaultManageUrl },
    });
  }
}

main().finally(() => prisma.$disconnect());
