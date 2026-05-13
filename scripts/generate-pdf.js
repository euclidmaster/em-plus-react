/* global process */
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = join(__dirname, '..', 'docs');

const manuals = [
  { html: 'manual_admin.html',   pdf: 'manual_admin.pdf',   name: '원장 매뉴얼' },
  { html: 'manual_teacher.html', pdf: 'manual_teacher.pdf', name: '선생님 매뉴얼' },
  { html: 'manual_student.html', pdf: 'manual_student.pdf', name: '학생 매뉴얼' },
];

(async () => {
  console.log('🚀 PDF 생성 시작...\n');
  const browser = await puppeteer.launch({ headless: 'new' });

  for (const m of manuals) {
    const htmlPath = `file:///${join(docsDir, m.html).replace(/\\/g, '/')}`;
    const pdfPath  = join(docsDir, m.pdf);

    process.stdout.write(`📄 ${m.name} 생성 중...`);
    const page = await browser.newPage();
    await page.goto(htmlPath, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
      printBackground: true,
    });
    await page.close();
    console.log(` ✅ 완료 → docs/${m.pdf}`);
  }

  await browser.close();
  console.log('\n✨ 모든 PDF 생성 완료!');
  console.log(`📁 저장 위치: ${docsDir}`);
})();
