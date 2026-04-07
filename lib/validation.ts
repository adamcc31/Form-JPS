import { z } from "zod";

export const registrationSchema = z.object({
  namaLengkap: z.string().min(1, "Nama Lengkap wajib diisi"),
  nik: z.string().regex(/^\d{16}$/, "NIK harus 16 digit angka"),
  nomorPaspor: z.string().optional(),
  tanggalLahir: z.string().min(1, "Tanggal Lahir wajib diisi"),
  alamat: z.string().min(1, "Alamat wajib diisi"),
  email: z.string().email("Format email tidak valid"),
  noWhatsapp: z.string().regex(/^\d+$/, "No WhatsApp harus berupa angka"),
  lpk: z.string().min(1, "LPK wajib diisi"),
  tanggalBerangkat: z.string().min(1, "Tanggal Berangkat wajib diisi"),
  tanggalAktivasi: z.string().min(1, "Tanggal Aktivasi wajib diisi"),
  pilihanPaket: z.string().min(1, "Pilihan Paket wajib diisi"),
  merkHp: z.string().min(1, "Merk & Tipe HP wajib diisi"),
  jenisKartu: z.enum(["Kartu Fisik", "E-SIM"], {
    errorMap: () => ({ message: "Jenis Kartu wajib dipilih" }),
  }),
  sumberInfo: z.string().min(1, "Sumber Info wajib diisi"),
  sumberInfoLainnya: z.string().optional(),
  pic: z.string().optional(),
  fotoKtp: z.object({
    fileName: z.string(),
    mimeType: z.string(),
    data: z.string(),
  }),
  fotoPaspor: z.object({
    fileName: z.string(),
    mimeType: z.string(),
    data: z.string(),
  }).optional(),
}).refine((data) => {
  if (data.sumberInfo === "Sosialisasi di LPK") {
    return !!data.pic;
  }
  return true;
}, {
  message: "PIC wajib dipilih ketika sumber info dari Sosialisasi di LPK",
  path: ["pic"],
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;
