const MAX_UPLOAD_BYTES = 20_000_000
const MAX_VIDEO_BYTES = 200_000_000

export interface UploadedMedia {
    type: 'image' | 'live-photo' | 'video'
    url: string
    videoUrl?: string
    duration?: number
}

export function pairMediaFiles(fileList: FileList | File[]): { photo?: File; video?: File }[] {
    const files = Array.from(fileList).filter(file =>
        file.type.startsWith('image/') || file.type.startsWith('video/') || /\.mov$/i.test(file.name),
    )
    const baseName = (file: File) => file.name.replace(/\.[^.]+$/, '').toLowerCase()
    const photos = files.filter(file => file.type.startsWith('image/'))
    const videos = files.filter(file => !file.type.startsWith('image/'))
    const unusedVideos = new Set(videos)
    const result: { photo?: File; video?: File }[] = photos.map(photo => {
        const video = videos.find(candidate => unusedVideos.has(candidate) && baseName(candidate) === baseName(photo))
        if (video) unusedVideos.delete(video)
        return { photo, video }
    })
    result.push(...Array.from(unusedVideos, video => ({ video })))
    return result
}

export async function uploadMedia(photo?: File, video?: File): Promise<UploadedMedia> {
    if (!photo && !video) throw new Error('请选择媒体文件')
    if (photo && !photo.type.startsWith('image/')) throw new Error('照片格式不受支持')
    if (video && !video.type.startsWith('video/') && !/\.mov$/i.test(video.name)) throw new Error('视频格式不受支持')
    if (photo && photo.size > MAX_UPLOAD_BYTES) throw new Error('图片不能超过 20 MB')
    if (video && video.size > MAX_VIDEO_BYTES) throw new Error('视频不能超过 200 MB')

    const body = new FormData()
    if (photo) body.set('file', photo)
    if (video) body.set('video', video)
    const response = await fetch('/api/private/media', { method: 'POST', body })
    const result = await response.json().catch(() => null) as (UploadedMedia & { error?: string }) | null
    if (!response.ok || !result?.url) throw new Error(result?.error || '媒体上传失败')
    return result
}

export async function uploadImage(file: File) {
    if (!file.type.startsWith('image/')) throw new Error('请选择图片文件')
    if (file.size > MAX_UPLOAD_BYTES) throw new Error('图片不能超过 20 MB')

    return (await uploadMedia(file)).url
}
