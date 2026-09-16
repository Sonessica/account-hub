const MAX_UPLOAD_BYTES = 20_000_000

export async function uploadImage(file: File) {
    if (!file.type.startsWith('image/')) throw new Error('请选择图片文件')
    if (file.size > MAX_UPLOAD_BYTES) throw new Error('图片不能超过 20 MB')

    const body = new FormData()
    body.set('file', file)
    const response = await fetch('/api/private/media', { method: 'POST', body })
    const result = await response.json().catch(() => null) as { url?: string; error?: string } | null
    if (!response.ok || !result?.url) throw new Error(result?.error || '图片上传失败')
    return result.url
}
