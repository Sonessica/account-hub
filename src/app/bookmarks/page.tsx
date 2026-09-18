import { ContentPageShell } from '@/components/site/ContentPageShell'

export default function BookmarksPage() {
  return <ContentPageShell title="网页收藏" description="整理值得反复访问的网站、工具与资料。">
    <div className="rounded-3xl bg-white p-10 text-sm text-black/45 shadow-sm">收藏内容将在这里按分组与标签浏览。</div>
  </ContentPageShell>
}
