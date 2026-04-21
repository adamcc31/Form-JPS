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
      if (blurScore < 50) {
        return NextResponse.json({ 
          error: "Gambar terdeteksi terlalu buram. Mohon ambil foto di tempat yang lebih terang atau fokuskan kamera." 
        }, { status: 400 });
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Proses Sharp: normalize, modulate, sharpen, resize, webp
    const enhancedBuffer = await sharp(buffer)
      .normalize()
      .modulate({
        brightness: 1.05, // sedikit diterangkan
        saturation: 1.1,  // sedikit lebih bewarna supaya tulisan jelas
      })
      .sharpen({ sigma: 1.5 })
      .resize({
        width: 2400,
        withoutEnlargement: true,
      })
      .webp({ quality: 90 })
      .toBuffer();

    // Pastikan folder uploads ada
    const uploadDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Nama file random
    const fileName = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.webp`;
    const filePath = join(uploadDir, fileName);

    await writeFile(filePath, enhancedBuffer);

    // Return URL untuk diakses dari public
    return NextResponse.json({ url: `/uploads/${fileName}` });
  } catch (error: any) {
    console.error("Error processing document:", error);
    return NextResponse.json(
      { error: "Gagal memproses dokumen di server" },
      { status: 500 }
    );
  }
}
