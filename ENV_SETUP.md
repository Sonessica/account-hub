# 环境变量配置指南

> **LEGACY**：本文针对旧版 Supabase 多用户路径。当前单用户 NAS 编辑器请以根目录 [`.env.example`](./.env.example) 与 [README.md](./README.md) 为准，主要变量为 `ACCOUNT_HUB_ADMIN_PASSWORD` / `ACCOUNT_HUB_SESSION_SECRET` / `NEXT_PUBLIC_APP_URL`。

## 📋 快速开始

### 1. 创建 `.env.local` 文件

在项目根目录创建 `.env.local` 文件（此文件已被 `.gitignore` 忽略，不会提交到 Git）。

### 2. 复制模板

复制 `.env.example` 文件的内容到 `.env.local`，然后填入你的 Supabase 凭证。

## 🔑 获取 Supabase 凭证

### 方法 1: 通过 Supabase Dashboard

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 **Settings** → **API**
4. 找到以下信息：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ 保密！)

### 方法 2: 使用 Supabase MCP (已配置)

你的项目信息：
- **Project URL**: `https://xxx.supabase.co`
- **Anon Key**: 已通过 MCP 获取（见下方）

## 📝 `.env.local` 文件示例

```env
# Supabase Configuration
# 从 Supabase Dashboard 获取这些值
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Service Role Key (需要从 Supabase Dashboard 获取)
# ⚠️ 警告：此密钥具有管理员权限，不要暴露在客户端代码中！
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🔒 安全注意事项

1. **永远不要**将 `.env.local` 文件提交到 Git
2. **永远不要**将 `SUPABASE_SERVICE_ROLE_KEY` 暴露在客户端代码中
3. `NEXT_PUBLIC_*` 前缀的变量会暴露在客户端，只用于安全的数据
4. 生产环境使用不同的环境变量（在 Vercel/部署平台配置）

## 🚀 部署配置

### Vercel 部署

1. 在 Vercel 项目设置中进入 **Environment Variables**
2. 添加所有环境变量（包括 `NEXT_PUBLIC_*` 前缀的）
3. 为不同环境（Production, Preview, Development）分别配置

### 其他平台

根据你的部署平台文档配置环境变量。

## ✅ 验证配置

配置完成后，重启开发服务器：

```bash
npm run dev
```

如果配置正确，应用应该能够：
- ✅ 连接到 Supabase 数据库
- ✅ 进行用户认证
- ✅ 保存和加载数据

## 🐛 常见问题

### 问题：`NEXT_PUBLIC_SUPABASE_URL is not defined`

**解决方案**: 确保 `.env.local` 文件在项目根目录，并且变量名以 `NEXT_PUBLIC_` 开头。

### 问题：无法连接到 Supabase

**解决方案**: 
1. 检查 Project URL 是否正确
2. 检查 API Key 是否正确
3. 检查 Supabase 项目是否已激活

### 问题：认证失败

**解决方案**:
1. 检查 RLS (Row Level Security) 策略是否正确配置
2. 检查数据库表是否已创建
3. 检查 API Key 权限

## 📚 相关文档

- [Supabase 文档](https://supabase.com/docs)
- [Next.js 环境变量](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase Auth 文档](https://supabase.com/docs/guides/auth)
