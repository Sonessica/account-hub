import { ContentPageShell } from '@/components/site/ContentPageShell'

export default function GalleryPage() {
  return <ContentPageShell title="图集" description="照片、视觉记录与主题影像合集。">
    <div className="grid grid-cols-3 gap-5">
      {[1, 2, 3].map(item => <div key={item} className="aspect-[4/3] rounded-3xl bg-white shadow-sm" />)}
    </div>
  </ContentPageShell>
}
