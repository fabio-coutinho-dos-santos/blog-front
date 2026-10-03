// Multipart upload straight from the browser to R2.
// The API only signs one URL per part; the video bytes never go through the backend.
//
// "Streaming": file.slice() returns a lazy Blob, so each part is read from disk only
// when its PUT is sent. A 2 GB video never sits in memory as a whole.
// XMLHttpRequest instead of fetch: fetch has no upload progress, and streaming request
// bodies (duplex: 'half') only work in Chromium over HTTP/2.

type PartUrl = { partNumber: number; url: string }

type InitResponse = {
  videoId: string
  uploadId: string
  partSize: number
  parts: PartUrl[]
}

type CompletedPart = { partNumber: number; etag: string }

export type UploadProgress = {
  uploadedBytes: number
  totalBytes: number
  completedParts: number
  totalParts: number
}

type UploadOptions = {
  accessToken: string
  onProgress?: (progress: UploadProgress) => void
  onStarted?: (info: { videoId: string; totalParts: number; partSize: number }) => void
  signal?: AbortSignal
  concurrency?: number
  maxRetries?: number
}

export class UploadCancelledError extends Error {
  constructor() {
    super('Upload cancelado.')
  }
}

async function api<T>(path: string, accessToken: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) {
    throw new Error(data?.error || `Erro ${response.status} na API.`)
  }
  return data as T
}

function putPart(
  url: string,
  body: Blob,
  onPartProgress: (loaded: number) => void,
  signal?: AbortSignal
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)

    xhr.upload.onprogress = (event) => onPartProgress(event.loaded)
    xhr.onload = () => {
      // The bucket CORS rule must expose ETag, otherwise this header is null
      const etag = xhr.getResponseHeader('ETag')
      if (xhr.status >= 200 && xhr.status < 300 && etag) {
        resolve(etag)
      } else if (xhr.status >= 200 && xhr.status < 300) {
        reject(new Error('R2 não expôs o ETag (verifique o CORS do bucket).'))
      } else {
        reject(new Error(`R2 respondeu ${xhr.status} ao enviar a parte.`))
      }
    }
    xhr.onerror = () => reject(new Error('Falha de rede ao enviar a parte (ou CORS bloqueado).'))
    xhr.onabort = () => reject(new UploadCancelledError())

    signal?.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(body)
  })
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function uploadVideoMultipart(file: File, options: UploadOptions) {
  const { accessToken, onProgress, onStarted, concurrency = 4, maxRetries = 3 } = options

  // Internal signal: aborts on user cancel AND when any part fails for good,
  // so the other workers stop instead of uploading to a discarded upload
  const controller = new AbortController()
  options.signal?.addEventListener('abort', () => controller.abort(), { once: true })
  const signal = controller.signal

  const init = await api<InitResponse>('/api/videos/uploads', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || 'video/mp4',
      size: file.size,
    }),
  })

  const { videoId, uploadId, partSize, parts } = init
  onStarted?.({ videoId, totalParts: parts.length, partSize })

  // Bytes sent per part; a retried part starts from 0 again
  const loadedByPart = new Map<number, number>()
  const completed: CompletedPart[] = []

  const report = () => {
    let uploadedBytes = 0
    loadedByPart.forEach((loaded) => (uploadedBytes += loaded))
    onProgress?.({
      uploadedBytes,
      totalBytes: file.size,
      completedParts: completed.length,
      totalParts: parts.length,
    })
  }

  const uploadOne = async ({ partNumber, url }: PartUrl) => {
    const start = (partNumber - 1) * partSize
    const blob = file.slice(start, Math.min(start + partSize, file.size))

    for (let attempt = 1; ; attempt++) {
      if (signal?.aborted) throw new UploadCancelledError()
      try {
        const etag = await putPart(
          url,
          blob,
          (loaded) => {
            loadedByPart.set(partNumber, loaded)
            report()
          },
          signal
        )
        loadedByPart.set(partNumber, blob.size)
        completed.push({ partNumber, etag })
        report()
        return
      } catch (error) {
        if (error instanceof UploadCancelledError || attempt >= maxRetries) throw error
        loadedByPart.set(partNumber, 0)
        await sleep(1000 * 2 ** (attempt - 1)) // 1s, 2s, 4s...
      }
    }
  }

  try {
    // N workers pulling parts from a shared queue
    const queue = [...parts]
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      for (let part = queue.shift(); part; part = queue.shift()) {
        await uploadOne(part)
      }
    })
    await Promise.all(workers)

    await api(`/api/videos/uploads/${videoId}/complete`, accessToken, {
      method: 'POST',
      body: JSON.stringify({ uploadId, parts: completed }),
    })

    return { videoId }
  } catch (error) {
    controller.abort()
    // Discard the parts already in R2 so they don't keep using storage
    await api(
      `/api/videos/uploads/${videoId}?uploadId=${encodeURIComponent(uploadId)}`,
      accessToken,
      { method: 'DELETE' }
    ).catch(() => {})
    throw error
  }
}
