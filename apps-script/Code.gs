const QUIZ_SHEET_NAME = 'Hasil Kuis';
const QUIZ_HEADERS = [
  'Waktu Pengumpulan',
  'ID Pengiriman',
  'Nama',
  'Kelas',
  'Jawaban Benar PG',
  'Nilai PG',
  'Nilai Uraian',
  'Nilai Akhir',
  'Jawaban PG (JSON)',
  'Jawaban Uraian (JSON)',
  'Rincian Rubrik Uraian (JSON)'
];

const PG_ANSWER_KEY = [
  'A', 'B', 'C', 'C', 'D',
  'A', 'A', 'C', 'B', 'C',
  'C', 'B', 'C', 'A', 'C'
];

const ESSAY_RUBRICS = [
  [
    /hardware|perangkat keras/,
    /software|perangkat lunak/,
    /brainware|pengguna|manusia/,
    /mengoperasikan|menjalankan|instruksi|bekerja bersama|saling berhubungan/
  ],
  [
    /\bram\b/,
    /sementara|volatile/,
    /\brom\b/,
    /permanen|tetap|non.?volatile|bios|uefi/
  ],
  [
    /\bssd\b/,
    /\bhdd\b|hard disk/,
    /lebih cepat|kecepatan|performa/,
    /flash|tanpa piringan|tidak menggunakan piringan|boot/
  ],
  [
    /\balu\b|arithmetic logic/,
    /aritmatika|logika|menghitung/,
    /\bcu\b|control unit/,
    /kendali|kontrol|mengatur|mengendalikan/
  ],
  [
    /\binput\b|masukan/,
    /\bprocess\b|proses|pemrosesan/,
    /\boutput\b|keluaran/,
    /cetak|printer|dokumen|kertas/
  ]
];

function setupQuizSheet() {
  const sheet = getQuizSheet_();
  formatQuizSheet_(sheet);
  return `Sheet "${sheet.getName()}" siap digunakan dan sudah dirapikan.`;
}

function doPost(event) {
  if (!event || !event.postData || !event.postData.contents) {
    return jsonResponse_({ status: 'error', message: 'Data pengiriman tidak ditemukan.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.postData.contents);
  } catch (error) {
    return jsonResponse_({ status: 'error', message: 'Format data pengiriman tidak valid.' });
  }

  const submission = validateSubmission_(payload);
  const grading = gradeSubmission_(submission);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  let submissionId;
  try {
    const sheet = getQuizSheet_();
    submissionId = Utilities.getUuid();
    sheet.appendRow([
      new Date(),
      submissionId,
      safeSheetText_(submission.nama),
      submission.kelas,
      grading.jumlahBenarPG,
      grading.nilaiPG,
      grading.nilaiUraian,
      grading.nilai,
      JSON.stringify(submission.pg),
      JSON.stringify(submission.essay),
      JSON.stringify(grading.rincianUraian)
    ]);
    formatQuizSubmissionRow_(sheet, sheet.getLastRow(), 1);
  } finally {
    lock.releaseLock();
  }

  return jsonResponse_({
    status: 'success',
    submissionId: submissionId,
    jumlahBenarPG: grading.jumlahBenarPG,
    nilaiPG: grading.nilaiPG,
    nilaiUraian: grading.nilaiUraian,
    nilai: grading.nilai,
    rincianUraian: grading.rincianUraian
  });
}

function validateSubmission_(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Data pengiriman tidak valid.');
  }

  const nama = typeof payload.nama === 'string' ? payload.nama.trim() : '';
  const kelas = typeof payload.kelas === 'string' ? payload.kelas.trim() : '';
  if (!nama || nama.length > 120 || !/^IX-[A-H]$/.test(kelas)) {
    throw new Error('Nama atau kelas peserta tidak valid.');
  }

  const pg = {};
  const essay = {};
  for (let index = 1; index <= PG_ANSWER_KEY.length; index++) {
    const key = `pg_${index}`;
    const answer = payload.pg && typeof payload.pg[key] === 'string' ? payload.pg[key].trim().toUpperCase() : '';
    if (!/^[A-D]$/.test(answer)) {
      throw new Error(`Jawaban pilihan ganda nomor ${index} tidak valid.`);
    }
    pg[key] = answer;
  }

  for (let index = 1; index <= ESSAY_RUBRICS.length; index++) {
    const key = `essay_${index}`;
    const answer = payload.essay && typeof payload.essay[key] === 'string' ? payload.essay[key].trim() : '';
    if (!answer || answer.length > 5000) {
      throw new Error(`Jawaban uraian nomor ${index} tidak valid.`);
    }
    essay[key] = answer;
  }

  return { nama: nama, kelas: kelas, pg: pg, essay: essay };
}

function gradeSubmission_(submission) {
  let jumlahBenarPG = 0;
  PG_ANSWER_KEY.forEach((correctAnswer, index) => {
    if (submission.pg[`pg_${index + 1}`] === correctAnswer) {
      jumlahBenarPG++;
    }
  });

  const rincianUraian = ESSAY_RUBRICS.map((criteria, index) => {
    const answer = submission.essay[`essay_${index + 1}`]
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const cocok = criteria.map(pattern => pattern.test(answer));
    const poin = cocok.filter(Boolean).length * 2;
    return { nomor: index + 1, poin: poin, maksimal: 8, kriteriaTerpenuhi: cocok.filter(Boolean).length, jumlahKriteria: criteria.length };
  });

  const nilaiPG = jumlahBenarPG * 4;
  const nilaiUraian = rincianUraian.reduce((total, item) => total + item.poin, 0);

  return {
    jumlahBenarPG: jumlahBenarPG,
    nilaiPG: nilaiPG,
    nilaiUraian: nilaiUraian,
    nilai: nilaiPG + nilaiUraian,
    rincianUraian: rincianUraian
  };
}

function getQuizSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('Hubungkan Apps Script dengan Google Sheets sebelum menjalankan kuis.');
  }

  let sheet = spreadsheet.getSheetByName(QUIZ_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(QUIZ_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(QUIZ_HEADERS);
  }

  return sheet;
}

function formatQuizSheet_(sheet) {
  const columnWidths = [175, 235, 190, 90, 125, 105, 115, 110, 340, 420, 360];
  const columnCount = QUIZ_HEADERS.length;
  const rowCount = Math.max(sheet.getMaxRows(), 2);
  const dataRowCount = Math.max(sheet.getLastRow() - 1, 1);

  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(4);
  sheet.setHiddenGridlines(true);
  sheet.setTabColor('#4f46e5');
  sheet.setRowHeight(1, 42);

  columnWidths.forEach((width, index) => sheet.setColumnWidth(index + 1, width));

  if (!sheet.getFilter()) {
    sheet.getRange(1, 1, rowCount, columnCount).createFilter();
  }

  sheet.getRange(1, 1, 1, columnCount)
    .setBackground('#312e81')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  sheet.getRange(2, 1, dataRowCount, columnCount).setVerticalAlignment('middle');
  sheet.getRange(2, 1, dataRowCount, 1).setNumberFormat('dd mmm yyyy, hh:mm');
  sheet.getRange(2, 5, dataRowCount, 4).setHorizontalAlignment('center').setNumberFormat('0');
  sheet.getRange(2, 9, dataRowCount, 3)
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP)
    .setVerticalAlignment('top');

  formatQuizSubmissionRow_(sheet, 2, Math.max(sheet.getLastRow() - 1, 0));
}

function formatQuizSubmissionRow_(sheet, row, count) {
  if (count === 0) {
    return;
  }

  const columnCount = QUIZ_HEADERS.length;
  const backgrounds = [];
  for (let index = 0; index < count; index++) {
    const color = (row + index) % 2 === 0 ? '#eef2ff' : '#ffffff';
    backgrounds.push(new Array(columnCount).fill(color));
  }

  sheet.getRange(row, 1, count, columnCount)
    .setBackgrounds(backgrounds)
    .setVerticalAlignment('middle')
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  sheet.getRange(row, 1, count, 1).setNumberFormat('dd mmm yyyy, hh:mm');
  sheet.getRange(row, 5, count, 4).setHorizontalAlignment('center').setNumberFormat('0');
  sheet.setRowHeights(row, count, 48);
}

function safeSheetText_(value) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
