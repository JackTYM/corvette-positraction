import { toWebp } from '~/utils/image'

interface UploadResult { key: string; url: string }

export function useImageUpload() {
  const { getJwt } = useAuth()

  async function upload(file: File): Promise<UploadResult> {
    const webp = await toWebp(file)
    const jwt = await getJwt()
    if (!jwt) throw new Error('Not signed in')
    const form = new FormData()
    form.append('file', webp, 'image.webp')
    return await $fetch<UploadResult>('/api/upload', {
      method: 'POST',
      body: form,
      headers: { Authorization: `Bearer ${jwt}` },
    })
  }

  async function remove(key: string): Promise<void> {
    const jwt = await getJwt()
    if (!jwt) throw new Error('Not signed in')
    await $fetch('/api/images', {
      method: 'DELETE',
      body: { key },
      headers: { Authorization: `Bearer ${jwt}` },
    })
  }

  return { upload, remove }
}
