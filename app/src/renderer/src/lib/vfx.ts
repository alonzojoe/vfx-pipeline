/** vfx://root/<path> for a path relative to the vfx folder (same encoding as the main process). */
export const vfxUrlOf = (rel: string): string => 'vfx://root/' + rel.split('/').map(encodeURIComponent).join('/')
