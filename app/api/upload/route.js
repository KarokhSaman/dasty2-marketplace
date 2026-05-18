import { v2 as cloudinary } from "cloudinary";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  // Allow Clerk-authenticated users (admin) OR cookie-authenticated sellers
  const { userId } = await auth();
  const sellerCookie = cookies().get("dasty2-seller")?.value;

  if (!userId && !sellerCookie) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: "dasty2/products" }, (err, res) =>
        err ? reject(err) : resolve(res)
      )
      .end(buffer);
  });

  return Response.json({ url: result.secure_url });
}
