"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registrationSchema, RegistrationFormData } from "@/lib/validation";
import DocumentScanner from "./DocumentScanner";

export default function RegistrationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [showEsimModal, setShowEsimModal] = useState(false);
  const [esimFeedback, setEsimFeedback] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
  });

  const sumberInfo = watch("sumberInfo");
  const showPICField = sumberInfo === "Sosialisasi di LPK";
  const showSumberInfoLainnya = sumberInfo === "Lainnya";

  const handleNamaLengkapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const upperValue = e.target.value.toUpperCase();
    setValue("namaLengkap", upperValue);
  };

  const formatImagePayload = (dataUri?: string, prefixStr?: string) => {
    if (!dataUri || !dataUri.startsWith("data:")) return ""; // Fallback if empty or not valid
    const [header, base64Data] = dataUri.split(",");
    const mimeType = header.split(":")[1].split(";")[0];
    const safeName = prefixStr ? prefixStr.replace(/[^a-zA-Z0-9]/g, '_') : 'document';
    
    return {
      fileName: `${safeName}.jpg`,
      mimeType: mimeType,
      data: base64Data
    };
  };

  const onSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);
    setSubmitStatus("idle");

    const payload = {
      "Nama Lengkap": data.namaLengkap,
      "NIK": data.nik,
      "Nomor Paspor": data.nomorPaspor || "",
      "Tanggal Lahir": data.tanggalLahir,
      "Alamat": data.alamat,
      "Email": data.email,
      "No WhatsApp": data.noWhatsapp,
      "LPK": data.lpk,
      "Tanggal Keberangkatan": data.tanggalBerangkat,
      "Tanggal Aktivasi": data.tanggalAktivasi,
      "Pilihan Paket": data.pilihanPaket,
      "Merk HP": data.merkHp,
      "Jenis Kartu": data.jenisKartu,
      "Sumber Informasi": showSumberInfoLainnya ? (data.sumberInfoLainnya || data.sumberInfo) : data.sumberInfo,
      "PIC": data.pic || "",
      "Foto KTP": formatImagePayload(data.fotoKtp, `KTP_${data.namaLengkap}`),
      "Foto Paspor": data.fotoPaspor ? formatImagePayload(data.fotoPaspor, `Paspor_${data.namaLengkap}`) : "",
    };

    try {
      const response = await fetch("https://script.google.com/macros/s/AKfycbzFFwbifbX0IL7rETJN9jiUU-nxWu0YK3kompuREnBTnIZANwDmB724wiCuRowGduGr/exec", {
        method: "POST",
        // Using 'text/plain;charset=utf-8' is a common workaround for CORS preflight issues with Google Apps Script
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSubmitStatus("success");
      } else {
        setSubmitStatus("error");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === "success") {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8 text-center mt-10 border border-green-100">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Registrasi Berhasil!</h2>
        <p className="text-gray-600 text-lg mb-8">Data Anda telah berhasil dikirim dan sedang kami proses.</p>
        <button
          onClick={() => window.location.reload()}
          className="py-3 px-8 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition shadow-md hover:shadow-lg"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  if (submitStatus === "error") {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8 text-center mt-10 border border-red-100">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Registrasi Gagal</h2>
        <p className="text-gray-600 text-lg mb-8">Terjadi kesalahan saat mengirim data. Silakan periksa koneksi internet Anda dan coba lagi.</p>
        <button
          onClick={() => setSubmitStatus("idle")}
          className="py-3 px-8 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition shadow-md hover:shadow-lg"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const inputClassName = (error?: any) => `
    w-full px-4 py-3 border rounded-xl bg-gray-50 text-gray-900 
    transition-colors duration-200 ease-in-out
    focus:bg-white focus:ring-2 focus:outline-none
    ${error 
      ? "border-red-300 focus:ring-red-200 focus:border-red-500" 
      : "border-gray-200 focus:ring-blue-100 focus:border-blue-500 hover:border-gray-300"}
  `;

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Header Section */}
      <div className="text-center mb-10 px-4">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
          Form Registrasi JP Smart
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Lengkapi formulir di bawah ini dengan data yang valid untuk mendaftar layanan JP Smart.
        </p>
        <div className="mt-6 inline-flex items-center bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Pastikan semua field bertanda bintang (*) telah diisi.
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 px-4 sm:px-0">
        
        {/* Section 1: Data Diri */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-3">1</span>
              Informasi Pribadi
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register("namaLengkap")}
                onChange={handleNamaLengkapChange}
                className={inputClassName(errors.namaLengkap)}
                placeholder="Sesuai dengan KTP/Paspor"
              />
              {errors.namaLengkap && <p className="mt-1.5 text-sm text-red-600 font-medium flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.namaLengkap.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  NIK <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("nik")}
                  maxLength={16}
                  className={inputClassName(errors.nik)}
                  placeholder="16 digit Nomor Induk Kependudukan"
                />
                {errors.nik && <p className="mt-1.5 text-sm text-red-600 font-medium flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.nik.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nomor Paspor <span className="text-gray-400 font-normal text-xs ml-1">(Opsional)</span>
                </label>
                <input
                  type="text"
                  {...register("nomorPaspor")}
                  className={inputClassName(errors.nomorPaspor)}
                  placeholder="Jika ada"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Tanggal Lahir <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register("tanggalLahir")}
                className={inputClassName(errors.tanggalLahir)}
              />
              {errors.tanggalLahir && <p className="mt-1.5 text-sm text-red-600 font-medium flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.tanggalLahir.message}</p>}
            </div>
          </div>
        </div>

        {/* Section 2: Kontak & Alamat */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-3">2</span>
              Kontak & Alamat
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Alamat Lengkap <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register("alamat")}
                rows={3}
                className={inputClassName(errors.alamat)}
                placeholder="Nama jalan, RT/RW, kelurahan, kecamatan, kota/kabupaten"
              />
              {errors.alamat && <p className="mt-1.5 text-sm text-red-600 font-medium flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.alamat.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  {...register("email")}
                  className={inputClassName(errors.email)}
                  placeholder="contoh@email.com"
                />
                {errors.email && <p className="mt-1.5 text-sm text-red-600 font-medium flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  No WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  {...register("noWhatsapp")}
                  className={inputClassName(errors.noWhatsapp)}
                  placeholder="081234567890"
                />
                {errors.noWhatsapp && <p className="mt-1.5 text-sm text-red-600 font-medium flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.noWhatsapp.message}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Keberangkatan */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-3">3</span>
              Detail Keberangkatan
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nama LPK <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register("lpk")}
                className={inputClassName(errors.lpk)}
                placeholder="Lembaga Pelatihan Kerja Anda"
              />
              {errors.lpk && <p className="mt-1.5 text-sm text-red-600 font-medium flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.lpk.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Tanggal Berangkat <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...register("tanggalBerangkat")}
                  className={inputClassName(errors.tanggalBerangkat)}
                />
                {errors.tanggalBerangkat && <p className="mt-1.5 text-sm text-red-600 font-medium flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.tanggalBerangkat.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Tanggal Aktivasi <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...register("tanggalAktivasi")}
                  className={inputClassName(errors.tanggalAktivasi)}
                />
                <p className="mt-1.5 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
                  💡 Tanggal kedatangan di Jepang / tanggal 1 di bulan selanjutnya untuk dapat full kuota free 2 bulan.
                </p>
                {errors.tanggalAktivasi && <p className="mt-1.5 text-sm text-red-600 font-medium flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.tanggalAktivasi.message}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Layanan & Informasi */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-3">4</span>
              Layanan & Informasi
            </h2>
          </div>
          <div className="p-6 space-y-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Pilihan Paket <span className="text-red-500">*</span>
              </label>
              <div className="mb-4 overflow-hidden rounded-xl border border-gray-200">
                <img src="/img/pict-3.png" alt="Paket Banner" className="w-full object-cover" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "3 GB Call Sim (Call dan Internet) (¥1.408/bulan)",
                  "20 GB Call Sim (Call dan Internet) (¥2.178/bulan)",
                  "100 GB Call Sim (Call dan Internet) (¥5.478/bulan)",
                  "3 GB Data Sim (Internet Only) (¥1.078/bulan)",
                  "20 GB Data Sim (Internet Only) (¥2.178/bulan)",
                  "100 GB Data Sim (Internet Only) (¥5.158/bulan)",
                ].map((paket) => (
                  <label key={paket} className={`flex items-start space-x-3 p-4 border rounded-xl cursor-pointer transition-all duration-200 ${watch("pilihanPaket") === paket ? "border-blue-500 bg-blue-50 shadow-sm" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}>
                    <div className="flex items-center h-5">
                      <input
                        type="radio"
                        value={paket}
                        {...register("pilihanPaket")}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-0.5"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 leading-tight">{paket.substring(0, paket.lastIndexOf(' ('))}</span>
                      <span className="text-xs text-blue-600 font-semibold mt-1">{paket.substring(paket.lastIndexOf(' ('))}</span>
                    </div>
                  </label>
                ))}
              </div>
              {errors.pilihanPaket && <p className="mt-2 text-sm text-red-600 font-medium flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.pilihanPaket.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Merk & Tipe HP <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register("merkHp")}
                className={inputClassName(errors.merkHp)}
                placeholder="Contoh: iPhone 13, Samsung Galaxy A54"
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Penting untuk memastikan kompatibilitas jaringan dengan SIM card.
              </p>
              {errors.merkHp && <p className="mt-1.5 text-sm text-red-600 font-medium flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.merkHp.message}</p>}
            </div>

            <div className="border-t border-gray-100 pt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Pilih Jenis Kartu <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`relative flex flex-col p-4 border rounded-xl cursor-pointer transition-all duration-200 ${watch("jenisKartu") === "Kartu Fisik" ? "border-blue-500 bg-blue-50 shadow-sm" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-900">Kartu Fisik</span>
                    <input
                      type="radio"
                      value="Kartu Fisik"
                      {...register("jenisKartu", {
                        onChange: (e) => {
                          if (e.target.value === "Kartu Fisik") setEsimFeedback(null);
                        }
                      })}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                  </div>
                  <span className="text-xs text-gray-600">Dikirim ke alamat (biaya ongkir berlaku)</span>
                </label>

                <label className={`relative flex flex-col p-4 border rounded-xl cursor-pointer transition-all duration-200 ${watch("jenisKartu") === "E-SIM" ? "border-blue-500 bg-blue-50 shadow-sm" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-900">E-SIM</span>
                    <input
                      type="radio"
                      value="E-SIM"
                      {...register("jenisKartu", {
                        onChange: (e) => {
                          if (e.target.value === "E-SIM") setShowEsimModal(true);
                        }
                      })}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                  </div>
                  <span className="text-xs text-gray-600">Dikirim secara digital & aktivasi instan</span>
                </label>
              </div>
              {esimFeedback && (
                <div className="mt-3 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg flex items-center border border-amber-200 animate-in fade-in">
                  <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {esimFeedback}
                </div>
              )}
              {errors.jenisKartu && <p className="mt-2 text-sm text-red-600 font-medium flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.jenisKartu.message}</p>}
            </div>

            <div className="border-t border-gray-100 pt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Sumber Informasi <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {["Instagram", "TikTok", "Facebook", "Teman/Rekan", "Sosialisasi di LPK", "Lainnya"].map((sumber) => (
                  <label key={sumber} className={`flex items-center space-x-3 p-3 border rounded-xl cursor-pointer transition-all duration-200 ${watch("sumberInfo") === sumber ? "border-blue-500 bg-blue-50 shadow-sm" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}>
                    <input
                      type="radio"
                      value={sumber}
                      {...register("sumberInfo")}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{sumber}</span>
                  </label>
                ))}
              </div>
              {errors.sumberInfo && <p className="mt-2 text-sm text-red-600 font-medium flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.sumberInfo.message}</p>}
            </div>

            {showSumberInfoLainnya && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Sebutkan Sumber Informasi Lainnya <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("sumberInfoLainnya")}
                  className={inputClassName(errors.sumberInfoLainnya)}
                  placeholder="Ketik disini..."
                />
              </div>
            )}

            {showPICField && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  Pilih PIC <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-4">
                  {["Mba There", "Mas Hegar"].map((pic) => (
                    <label key={pic} className={`flex-1 flex items-center space-x-3 p-3 bg-white border rounded-lg cursor-pointer transition-all duration-200 ${watch("pic") === pic ? "border-blue-500 shadow-sm" : "border-gray-200 hover:border-blue-300"}`}>
                      <input
                        type="radio"
                        value={pic}
                        {...register("pic")}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">{pic}</span>
                    </label>
                  ))}
                </div>
                {errors.pic && <p className="mt-2 text-sm text-red-600 font-medium flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{errors.pic.message}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Upload Dokumen */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-3">5</span>
              Upload Dokumen Identitas
            </h2>
          </div>
          <div className="p-6 space-y-8">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                  <p className="font-semibold mb-1">Panduan Pengambilan Foto:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Pastikan identitas (KTP/Paspor) terlihat jelas dan tidak buram.</li>
                    <li>Gunakan pencahayaan yang cukup, hindari pantulan cahaya pada kartu.</li>
                    <li>Posisikan kartu identitas sesuai dengan bingkai (frame) panduan yang tersedia di kamera.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <DocumentScanner
                label="Foto KTP"
                overlayType="ktp"
                required
                bannerImage="/img/pict-2.jpg"
                onCapture={(url) => setValue("fotoKtp", url)}
              />
              {errors.fotoKtp && <p className="mt-2 text-sm text-red-600 font-medium flex items-center"><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>Foto KTP wajib diambil</p>}
            </div>

            <div className="space-y-4 border-t border-gray-100 pt-8">
              <DocumentScanner
                label="Foto Paspor"
                overlayType="paspor"
                bannerImage="/img/pict-1.jpg"
                onCapture={(url) => setValue("fotoPaspor", url)}
              />
              <p className="text-sm text-gray-500 mt-2 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Lewati bagian ini jika Anda belum memiliki paspor.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`
              w-full py-4 px-6 text-white text-lg font-bold rounded-xl shadow-lg
              transition-all duration-300 ease-in-out transform
              ${isSubmitting 
                ? "bg-gray-400 cursor-not-allowed scale-100" 
                : "bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30 hover:-translate-y-1 active:scale-95"}
            `}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Mengirim Data...
              </span>
            ) : "Kirim Form Registrasi"}
          </button>
          <p className="text-center text-sm text-gray-500 mt-4">
            Dengan mengirimkan form ini, Anda menyetujui syarat dan ketentuan yang berlaku.
          </p>
        </div>
      </form>

      {/* E-SIM Confirmation Modal */}
      {showEsimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Konfirmasi Perangkat</h3>
              <p className="text-gray-600 mb-6">Apakah handphone Anda mendukung E-SIM?</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setValue("jenisKartu", "Kartu Fisik", { shouldValidate: true });
                    setEsimFeedback("Perangkat tidak mendukung E-SIM, dialihkan ke Kartu Fisik.");
                    setShowEsimModal(false);
                  }}
                  className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl transition"
                >
                  Tidak
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEsimFeedback(null);
                    setShowEsimModal(false);
                  }}
                  className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-md"
                >
                  Ya, Mendukung
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
