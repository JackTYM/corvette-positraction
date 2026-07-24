export interface DocUploadResult { key: string; filename: string; mimeType: string; size: number; url: string }

export function useDocumentUpload() {
  const { getJwt } = useAuth()

  async function upload(file: File): Promise<DocUploadResult> {
    const jwt = await getJwt()
    if (!jwt) throw new Error('Not signed in')
    const form = new FormData()
    form.append('file', file, file.name)
    return await $fetch<DocUploadResult>('/api/documents', {
      method: 'POST',
      body: form,
      headers: { Authorization: `Bearer ${jwt}` },
    })
  }

  async function remove(key: string): Promise<void> {
    const jwt = await getJwt()
    if (!jwt) throw new Error('Not signed in')
    await $fetch('/api/documents', {
      method: 'DELETE',
      body: { key },
      headers: { Authorization: `Bearer ${jwt}` },
    })
  }

  return { upload, remove }
}
