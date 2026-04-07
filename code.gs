function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    // Ganti dengan ID folder Google Drive Anda untuk menyimpan foto
    var folderId = "1Ch033UoIyJCxOWuOSnWb_Td1fP7vHlWR";
    var folder = DriveApp.getFolderById(folderId);
    
    // Upload Foto KTP jika ada
    var ktpUrl = "";
    if (data['Foto KTP'] && data['Foto KTP'].data) {
      var ktpBlob = Utilities.newBlob(Utilities.base64Decode(data['Foto KTP'].data), data['Foto KTP'].mimeType, data['Foto KTP'].fileName);
      var ktpFile = folder.createFile(ktpBlob);
      ktpUrl = ktpFile.getUrl();
    }
    
    // Upload Foto Paspor jika ada
    var pasporUrl = "";
    if (data['Foto Paspor'] && data['Foto Paspor'].data) {
      var pasporBlob = Utilities.newBlob(Utilities.base64Decode(data['Foto Paspor'].data), data['Foto Paspor'].mimeType, data['Foto Paspor'].fileName);
      var pasporFile = folder.createFile(pasporBlob);
      pasporUrl = pasporFile.getUrl();
    }

    // Buka Spreadsheet dan Sheet tujuan
    // Ganti "Sheet1" dengan nama sheet Anda jika berbeda
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
    
    // Jika sheet belum ada header, buat header
    if (sheet.getLastRow() === 0) {
      var headers = [
        "Timestamp", "Nama Lengkap", "NIK", "Nomor Paspor", "Tanggal Lahir", 
        "Alamat", "Email", "No WhatsApp", "LPK", "Tanggal Keberangkatan", 
        "Tanggal Aktivasi", "Pilihan Paket", "Merk HP", "Jenis Kartu", "Sumber Informasi", "PIC", "Link Foto KTP", "Link Foto Paspor"
      ];
      sheet.appendRow(headers);
    }

    // Siapkan baris data untuk dimasukkan ke sheet
    var newRow = [
      new Date(),
      data['Nama Lengkap'] || "",
      data['NIK'] || "",
      data['Nomor Paspor'] || "",
      data['Tanggal Lahir'] || "",
      data['Alamat'] || "",
      data['Email'] || "",
      data['No WhatsApp'] || "",
      data['LPK'] || "",
      data['Tanggal Keberangkatan'] || "",
      data['Tanggal Aktivasi'] || "",
      data['Pilihan Paket'] || "",
      data['Merk HP'] || "",
      data['Jenis Kartu'] || "",
      data['Sumber Informasi'] || "",
      data['PIC'] || "",
      ktpUrl, // Simpan link file di Drive
      pasporUrl // Simpan link file di Drive
    ];
    
    // Tambahkan baris baru ke sheet
    sheet.appendRow(newRow);
    
    return ContentService.createTextOutput(JSON.stringify({ "result": "success" })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
