import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { join } from "path";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const blurScoreStr = formData.get("blurScore") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    // Evaluasi blur score jika client mengirimkan
    if (blurScoreStr) {
      const blurScore = parseFloat(blurScoreStr);
      // Nilai threshold variance Laplacian bisa diatur, 
      // umumnya < 100 berarti terlalu blur
      if (!isNaN(blurScore) && blurScore < 50) {
        return NextResponse.json({ 
          error: "Gambar terdeteksi terlalu buram. Mohon ambil foto di tempat yang lebih terang atau fokuskan kamera." 
        }, { status: 400 });
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json({ error: "File kosong atau rusak" }, { status: 400 });
    }

    // Proses Sharp: normalize, modulate, sharpen, resize, webp
    // Pipeline dijalankan per-step supaya kita bisa debug kalau error
    let pipeline = sharp(buffer);
    
    // Dapatkan metadata dulu untuk memastikan gambar valid
    const metadata = await pipeline.metadata();
    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ error: "File bukan gambar yang valid" }, { status: 400 });
    }

    const enhancedBuffer = await sharp(buffer)
      .rotate() // Auto-rotate berdasarkan EXIF orientation (penting untuk foto HP)
      .normalize()
      .modulate({
        brightness: 1.05,
        saturation: 1.1,
      })
      .sharpen({ sigma: 1.5 })
      .resize({
        width: 2400,
        withoutEnlargement: true,
      })
      .webp({ quality: 90 })
      .toBuffer();

    // Convert to Base64 (Data URI) to avoid local file system write errors on serverless deployments (Vercel/Netlify)
    const base64Data = enhancedBuffer.toString("base64");
    const dataUri = `data:image/webp;base64,${base64Data}`;

    // Return Data URI for direct saving to GS Payload
    return NextResponse.json({ url: dataUri });
  } catch (error: any) {
    console.error("Error processing document:", error?.message || error);
    console.error("Stack:", error?.stack);
    return NextResponse.json(
      { error: `Gagal memproses dokumen: ${error?.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
