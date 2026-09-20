import {
  DEFAULT_COVER_EFFECT,
  DEFAULT_COVER_INTERVAL_MS,
  type CoverEffect,
  type GalleryImage,
  type ImageWidgetConfig,
} from '../types'

function newImageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createGalleryImage(
  src: string,
  alt?: string,
  media: Pick<GalleryImage, 'type' | 'videoSrc' | 'duration'> = {},
): GalleryImage {
  return { id: newImageId(), src, alt, ...media }
}

/** Normalize legacy single-image widgets into a gallery shape. */
export function normalizeImageGallery(widget: ImageWidgetConfig): {
  images: GalleryImage[]
  coverMode: 'fixed' | 'random'
  coverId: string | undefined
  coverIntervalMs: number
  coverEffect: CoverEffect
} {
  const raw = Array.isArray(widget.images) ? widget.images.filter((img) => !!img?.src) : []
  const images: GalleryImage[] = raw.length
    ? raw.map((img) => ({
        id: img.id || createGalleryImage(img.src).id,
        src: img.src,
        type: img.type || (img.videoSrc ? 'video' : 'image'),
        videoSrc: img.videoSrc,
        duration: img.duration,
        alt: img.alt,
      }))
    : widget.src
      ? [{ id: createGalleryImage(widget.src).id, src: widget.src, alt: widget.alt }]
      : []

  const coverId =
    widget.coverId && images.some((img) => img.id === widget.coverId)
      ? widget.coverId
      : images[0]?.id

  const coverMode: 'fixed' | 'random' =
    images.length > 1 && widget.coverMode === 'random' ? 'random' : 'fixed'

  return {
    images,
    coverMode,
    coverId,
    coverIntervalMs: widget.coverIntervalMs || DEFAULT_COVER_INTERVAL_MS,
    coverEffect: widget.coverEffect || DEFAULT_COVER_EFFECT,
  }
}

export function findImageIndexById(images: GalleryImage[], id?: string): number {
  if (!id) return -1
  return images.findIndex((img) => img.id === id)
}

export function resolveCoverIndex(
  widget: ImageWidgetConfig,
  options: { liveIndex?: number } = {},
): number {
  const { images, coverId, coverMode } = normalizeImageGallery(widget)
  if (!images.length) return 0
  const fixed = findImageIndexById(images, coverId)
  const fixedIndex = fixed >= 0 ? fixed : 0
  if (coverMode !== 'random' || images.length <= 1) return fixedIndex
  if (typeof options.liveIndex === 'number' && options.liveIndex >= 0) {
    return options.liveIndex % images.length
  }
  return fixedIndex
}

export function resolveCoverImage(widget: ImageWidgetConfig, liveIndex?: number): GalleryImage | null {
  const { images } = normalizeImageGallery(widget)
  if (!images.length) return null
  return images[resolveCoverIndex(widget, { liveIndex })] || null
}

/** Build a widget patch after images list mutation; keeps legacy `src` in sync. */
export function buildGalleryPatch(
  prev: ImageWidgetConfig,
  images: GalleryImage[],
  overrides: Partial<Pick<ImageWidgetConfig, 'coverId' | 'coverMode' | 'coverEffect'>> = {},
): Partial<ImageWidgetConfig> {
  const nextImages = images.slice()
  const nextCoverId =
    overrides.coverId && nextImages.some((img) => img.id === overrides.coverId)
      ? overrides.coverId
      : nextImages.find((img) => img.id === prev.coverId)?.id || nextImages[0]?.id

  const coverMode: 'fixed' | 'random' =
    nextImages.length > 1 ? overrides.coverMode || prev.coverMode || 'fixed' : 'fixed'

  const cover = nextImages.find((img) => img.id === nextCoverId)
  return {
    images: nextImages,
    coverId: nextCoverId,
    coverMode,
    coverIntervalMs: prev.coverIntervalMs || DEFAULT_COVER_INTERVAL_MS,
    coverEffect: overrides.coverEffect || prev.coverEffect || DEFAULT_COVER_EFFECT,
    src: cover?.src || '',
  }
}

export function reorderGalleryImages(images: GalleryImage[], from: number, to: number): GalleryImage[] {
  if (from === to || from < 0 || to < 0 || from >= images.length || to >= images.length) {
    return images
  }
  const next = images.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
