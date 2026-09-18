import { ContentPageShell } from '@/components/site/ContentPageShell'

export default function NotesPage() {
  return <ContentPageShell title="笔记" description="记录想法、研究与长期积累。">
    <div className="rounded-3xl bg-white p-10 text-sm text-black/45 shadow-sm">笔记内容将在这里按时间与主题展开。</div>
  </ContentPageShell>
}
