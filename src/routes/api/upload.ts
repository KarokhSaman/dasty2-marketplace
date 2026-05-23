import { createFileRoute } from '@tanstack/react-router'
import { getCookie } from '@tanstack/react-start/server'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sellerCookie = getCookie('dasty2-seller')
        const adminCookie  = getCookie('dasty2-admin')

        if (!sellerCookie && !adminCookie) {
          return Response.json({ error: 'unauthorized' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file')
        if (!file || typeof file === 'string') {
          return Response.json({ error: 'no_file' }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const result = await new Promise<{ secure_url: string }>(
          (resolve, reject) => {
            cloudinary.uploader
              .upload_stream({ folder: 'dasty2/products' }, (err, res) =>
                err || !res ? reject(err) : resolve(res),
              )
              .end(buffer)
          },
        )

        return Response.json({ url: result.secure_url })
      },
    },
  },
})
