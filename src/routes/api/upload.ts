import { createFileRoute } from '@tanstack/react-router'
import { getCookie } from '@tanstack/react-start/server'
import { auth } from '@clerk/tanstack-react-start/server'
import { env } from 'cloudflare:workers'
import { Buffer } from 'node:buffer'
import { v2 as cloudinary } from 'cloudinary'

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

cloudinary.config({
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
})

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sellerCookie = getCookie('dasty2-seller')
        const { userId } = sellerCookie
          ? { userId: null }
          : await auth().catch(() => ({ userId: null }))

        if (!userId && !sellerCookie) {
          return Response.json({ error: 'unauthorized' }, { status: 401 })
        }

        const contentLength = Number(request.headers.get('content-length') ?? 0)
        if (contentLength > MAX_UPLOAD_BYTES + 4096) {
          return Response.json({ error: 'file_too_large' }, { status: 413 })
        }

        const formData = await request.formData()
        const file = formData.get('file')
        if (!file || typeof file === 'string') {
          return Response.json({ error: 'no_file' }, { status: 400 })
        }

        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
          return Response.json(
            { error: 'unsupported_file_type' },
            { status: 415 },
          )
        }

        if (file.size > MAX_UPLOAD_BYTES) {
          return Response.json({ error: 'file_too_large' }, { status: 413 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const result = await new Promise<{ secure_url: string }>(
          (resolve, reject) => {
            cloudinary.uploader
              .upload_stream(
                { folder: 'dasty2/products', resource_type: 'image' },
                (err, res) => (err || !res ? reject(err) : resolve(res)),
              )
              .end(buffer)
          },
        )

        return Response.json({ url: result.secure_url })
      },
    },
  },
})
