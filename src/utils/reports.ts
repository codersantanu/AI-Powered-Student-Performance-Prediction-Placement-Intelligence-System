import { jsPDF } from 'jspdf';
import type { ReportData } from '../types';
function valueText(value: unknown): string { if (value == null) return 'Not available'; if (typeof value === 'object') return JSON.stringify(value); return String(value); }
export function downloadReportPdf(report: ReportData, preview: boolean, studentName: string) {
  const doc = new jsPDF();
  doc.setProperties({ title: report.title, author: 'StudentIQ', subject: preview ? 'Sample preview report — not an official academic record' : 'Student academic report' });
  doc.setTextColor(79, 70, 229); doc.setFontSize(22); doc.text('StudentIQ', 20, 24); doc.setTextColor(23, 32, 51); doc.setFontSize(16); doc.text(report.title, 20, 40); doc.setFontSize(10); doc.text(`Student: ${studentName}`, 20, 52); doc.text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, 20, 60); if (report.semester) doc.text(`Semester: ${report.semester}`, 20, 68);
  if (preview) { doc.setTextColor(180, 83, 9); doc.setFontSize(10); doc.text('SAMPLE PREVIEW — NOT AN OFFICIAL STUDENT RECORD', 20, 78); }
  let y = preview ? 91 : 82;
  const entries = Object.entries(report.data).filter(([key]) => !['profile', 'recommendations'].includes(key));
  const write = (text: string) => { doc.setFontSize(10); const lines = doc.splitTextToSize(text, 170); for (const line of lines) { if (y > 265) { doc.addPage(); y = 22; } doc.text(line, 20, y); y += 5; } y += 3; };
  for (const [key, value] of entries) { if (y > 255) { doc.addPage(); y = 22; } doc.setFont('helvetica', 'bold'); write(key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())); doc.setFont('helvetica', 'normal'); write(valueText(value)); }
  const pages = doc.getNumberOfPages(); for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setTextColor(148, 163, 184); doc.setFontSize(8); doc.text(`${i} / ${pages} · StudentIQ${preview ? ' · Sample data' : ''}`, 190, 287, { align: 'right' }); }
  doc.save(`StudentIQ-${report.key}${preview ? '-sample' : ''}-report.pdf`);
}
