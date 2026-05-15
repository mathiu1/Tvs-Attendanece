import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STATUS_SHORT = {
  '1st_shift': '1st',
  '2nd_shift': '2nd',
  general: 'G',
  AA: 'AA',
  'C-off': 'CO',
  OT: 'OT',
  holiday: 'H',
};

// Color palette for statuses (RGB arrays for jsPDF)
const STATUS_COLORS = {
  '1st_shift': { bg: [30, 58, 138], text: [96, 165, 250] },   // blue
  '2nd_shift': { bg: [59, 30, 109], text: [192, 132, 252] },   // purple
  general:     { bg: [13, 74, 68], text: [45, 212, 191] },     // teal
  AA:          { bg: [100, 20, 20], text: [248, 113, 113] },    // red
  'C-off':     { bg: [92, 60, 5], text: [251, 191, 36] },      // amber
  OT:          { bg: [100, 45, 10], text: [251, 146, 60] },     // orange
  holiday:     { bg: [8, 70, 82], text: [34, 211, 238] },       // cyan
};

/**
 * Generate a modern, professional attendance PDF report
 * 
 * @param {Object} params
 * @param {Array} params.workers - filteredData array from the report grid
 * @param {Array} params.dates - array of Date objects for the period
 * @param {string} params.reportPeriodTitle - e.g. "April 21 to May 20, 2026"
 * @param {string} params.departmentName - selected department name or "All Departments"
 */
export function exportAttendancePDF({ workers, dates, reportPeriodTitle, departmentName }) {
  // Use landscape for wide attendance grid
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ── Header Bar ──
  const headerH = 22;
  doc.setFillColor(15, 23, 42); // dark navy
  doc.rect(0, 0, pageWidth, headerH, 'F');
  
  // Accent line
  doc.setFillColor(99, 102, 241); // indigo accent
  doc.rect(0, headerH, pageWidth, 1.5, 'F');

  // Company branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('TVS ATTENDANCE MANAGEMENT', 10, 9);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Monthly Attendance Report', 10, 15);

  // Report generation info (right side)
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const generatedAt = new Date().toLocaleDateString('en-IN', { 
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
  doc.text(`Generated: ${generatedAt}`, pageWidth - 10, 9, { align: 'right' });
  doc.text(`Page 1`, pageWidth - 10, 15, { align: 'right' });

  // ── Report Info Section ──
  const infoY = headerH + 5;
  doc.setFillColor(30, 41, 59); // slate-800
  doc.roundedRect(10, infoY, pageWidth - 20, 18, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(226, 232, 240); // slate-200
  doc.text(`Attendance Report: ${reportPeriodTitle}`, 16, infoY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Department: ${departmentName}`, 16, infoY + 13);
  doc.text(`Total Workers: ${workers.length}`, pageWidth / 2 - 20, infoY + 13);
  doc.text(`Total Days: ${dates.length}`, pageWidth - 80, infoY + 13);

  // ── Legend Strip ──
  const legendY = infoY + 22;
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(10, legendY, pageWidth - 20, 8, 2, 2, 'F');

  doc.setFontSize(7);
  const legendItems = Object.entries(STATUS_SHORT);
  const legendLabels = {
    '1st_shift': '1st Shift', '2nd_shift': '2nd Shift', general: 'General',
    AA: 'Absent', 'C-off': 'C-Off', OT: 'Overtime', holiday: 'Holiday'
  };
  let legendX = 16;
  legendItems.forEach(([key, short]) => {
    const color = STATUS_COLORS[key];
    // Colored dot
    doc.setFillColor(...color.text);
    doc.circle(legendX, legendY + 4, 1.2, 'F');
    legendX += 3;
    // Label
    doc.setTextColor(...color.text);
    doc.text(`${short} — ${legendLabels[key]}`, legendX, legendY + 5);
    legendX += doc.getTextWidth(`${short} — ${legendLabels[key]}`) + 6;
  });

  // ── Build Table Data ──
  const formatYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Table headers
  const headers = [
    { content: '#', styles: { halign: 'center', cellWidth: 7 } },
    { content: 'Employee', styles: { cellWidth: 28 } },
    { content: 'ID', styles: { cellWidth: 20 } },
    { content: 'Dept', styles: { cellWidth: 18 } },
    { content: 'P', styles: { halign: 'center', cellWidth: 7 } },
    { content: 'AB', styles: { halign: 'center', cellWidth: 7 } },
    { content: 'OT', styles: { halign: 'center', cellWidth: 8 } },
  ];

  // Date column headers
  dates.forEach((dateObj) => {
    const dayNum = dateObj.getDate();
    const dayName = dateObj.toLocaleDateString('en', { weekday: 'short' }).substring(0, 2);
    const isSun = dateObj.getDay() === 0;
    headers.push({
      content: `${dayNum}\n${dayName}`,
      styles: { 
        halign: 'center', 
        cellWidth: 9,
        fillColor: isSun ? [100, 20, 20] : [30, 41, 59],
        textColor: isSun ? [248, 113, 113] : [148, 163, 184],
        fontSize: 5.5,
      }
    });
  });

  // Table body rows
  const body = workers.map((worker, idx) => {
    const row = [
      { content: String(idx + 1), styles: { halign: 'center', textColor: [100, 116, 139], fontSize: 6 } },
      { content: worker.name, styles: { fontStyle: 'bold', textColor: [226, 232, 240], fontSize: 6.5 } },
      { content: worker.employeeId, styles: { textColor: [148, 163, 184], fontSize: 6, font: 'courier' } },
      { content: worker.department, styles: { textColor: [148, 163, 184], fontSize: 6 } },
      { content: String(worker.presentCount), styles: { halign: 'center', textColor: [34, 197, 94], fontStyle: 'bold', fontSize: 6.5 } },
      { content: String(worker.absentCount), styles: { halign: 'center', textColor: [239, 68, 68], fontStyle: 'bold', fontSize: 6.5 } },
      { content: `${worker.totalOtHours}h`, styles: { halign: 'center', textColor: [251, 146, 60], fontStyle: 'bold', fontSize: 6.5 } },
    ];

    // Date cells
    dates.forEach((dateObj) => {
      const dateKey = formatYMD(dateObj);
      const entry = worker.days[dateKey];
      const isSun = dateObj.getDay() === 0;

      if (entry) {
        const color = STATUS_COLORS[entry.status] || { bg: [30, 41, 59], text: [148, 163, 184] };
        const statusText = STATUS_SHORT[entry.status] || '?';
        const cellText = entry.otHours > 0 ? `${statusText}\n+${entry.otHours}h` : statusText;
        row.push({
          content: cellText,
          styles: {
            halign: 'center',
            fillColor: color.bg,
            textColor: color.text,
            fontStyle: 'bold',
            fontSize: entry.otHours > 0 ? 5 : 5.5,
            cellPadding: { top: 1, bottom: 1, left: 1, right: 1 },
          }
        });
      } else {
        row.push({
          content: '—',
          styles: {
            halign: 'center',
            textColor: [55, 65, 81],
            fillColor: isSun ? [40, 20, 20] : undefined,
            fontSize: 5.5,
          }
        });
      }
    });

    return row;
  });

  // ── Render Table ──
  const tableStartY = legendY + 12;

  const tableResult = autoTable(doc, {
    head: [headers],
    body: body,
    startY: tableStartY,
    theme: 'plain',
    styles: {
      fillColor: [15, 23, 42],        // slate-900 row bg
      textColor: [148, 163, 184],      // slate-400
      lineColor: [30, 41, 59],         // slate-800 borders
      lineWidth: 0.2,
      fontSize: 6,
      cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
      valign: 'middle',
      overflow: 'hidden',
    },
    headStyles: {
      fillColor: [30, 41, 59],          // slate-800
      textColor: [148, 163, 184],        // slate-400
      fontStyle: 'bold',
      fontSize: 6,
      lineColor: [51, 65, 85],
      lineWidth: 0.3,
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [22, 30, 48],           // slightly lighter alternate
    },
    margin: { left: 10, right: 10 },
    tableLineColor: [30, 41, 59],
    tableLineWidth: 0.2,
    didDrawPage: (data) => {
      // Footer on every page
      const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
      doc.setFillColor(15, 23, 42);
      doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
      doc.setFillColor(99, 102, 241);
      doc.rect(0, pageHeight - 10, pageWidth, 0.5, 'F');
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('TVS Attendance Management System', 10, pageHeight - 4);
      doc.text(`Page ${pageNum}`, pageWidth - 10, pageHeight - 4, { align: 'right' });
      doc.text(`Report Period: ${reportPeriodTitle}`, pageWidth / 2, pageHeight - 4, { align: 'center' });
    },
  });

  // ── Summary on new page ──
  doc.addPage();
  drawSummary(doc, autoTable, 15, workers, dates, pageWidth, pageHeight, reportPeriodTitle);

  // Save the PDF
  const filename = `Attendance_Report_${reportPeriodTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}

function drawSummary(doc, autoTable, startY, workers, dates, pageWidth, pageHeight, reportPeriodTitle) {
  // ── Page header ──
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 14, pageWidth, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TVS ATTENDANCE — DETAILED SUMMARY', 10, 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(reportPeriodTitle, pageWidth - 10, 9, { align: 'right' });

  let y = startY + 6;

  // ── Compute all stats ──
  const totalPresent = workers.reduce((s, w) => s + w.presentCount, 0);
  const totalAbsent = workers.reduce((s, w) => s + w.absentCount, 0);
  const totalOT = workers.reduce((s, w) => s + w.totalOtHours, 0);
  const totalOTDays = workers.reduce((s, w) => s + w.otCount, 0);
  const totalPossible = workers.length * dates.length;
  const avgAtt = totalPossible > 0 ? ((totalPresent / totalPossible) * 100).toFixed(1) : '0.0';

  // Shift-wise counts
  let shift1 = 0, shift2 = 0, general = 0, cOff = 0, holiday = 0;
  workers.forEach(w => {
    Object.values(w.days).forEach(d => {
      if (d.status === '1st_shift') shift1++;
      else if (d.status === '2nd_shift') shift2++;
      else if (d.status === 'general') general++;
      else if (d.status === 'C-off') cOff++;
      else if (d.status === 'holiday') holiday++;
    });
  });

  // ── 1. Overview Cards (6 cards) ──
  const cardW = (pageWidth - 20 - 25) / 6;
  const cardH = 22;
  const overviewCards = [
    { label: 'Total Workers', value: String(workers.length), color: [129, 140, 248], bg: [30, 41, 80] },
    { label: 'Present Days', value: String(totalPresent), color: [34, 197, 94], bg: [13, 74, 68] },
    { label: 'Absent Days', value: String(totalAbsent), color: [248, 113, 113], bg: [100, 20, 20] },
    { label: 'C-Off Days', value: String(cOff), color: [251, 191, 36], bg: [92, 60, 5] },
    { label: 'OT Hours', value: `${totalOT}h`, color: [251, 146, 60], bg: [100, 45, 10] },
    { label: 'Avg Attendance', value: `${avgAtt}%`, color: [96, 165, 250], bg: [30, 58, 138] },
  ];
  overviewCards.forEach((c, i) => {
    const x = 10 + i * (cardW + 5);
    doc.setFillColor(...c.bg);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...c.color);
    doc.text(c.value, x + cardW / 2, y + 10, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(c.label, x + cardW / 2, y + 17, { align: 'center' });
  });
  y += cardH + 8;

  // ── 2. Shift Distribution Table ──
  const halfW = (pageWidth - 30) / 2;

  // Section title
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(10, y, halfW, 8, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text('SHIFT DISTRIBUTION', 14, y + 5.5);

  // Right section title
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(20 + halfW, y, halfW, 8, 2, 2, 'F');
  doc.text('DEPARTMENT BREAKDOWN', 24 + halfW, y + 5.5);
  y += 10;

  // Shift table (left)
  const shiftTableY = y;
  autoTable(doc, {
    startY: shiftTableY,
    margin: { left: 10, right: pageWidth - 10 - halfW },
    head: [[
      { content: 'Shift Type', styles: { halign: 'left' } },
      { content: 'Days', styles: { halign: 'center' } },
      { content: '%', styles: { halign: 'center' } },
    ]],
    body: [
      ['1st Shift', String(shift1), totalPresent > 0 ? ((shift1/totalPresent)*100).toFixed(1)+'%' : '0%'],
      ['2nd Shift', String(shift2), totalPresent > 0 ? ((shift2/totalPresent)*100).toFixed(1)+'%' : '0%'],
      ['General', String(general), totalPresent > 0 ? ((general/totalPresent)*100).toFixed(1)+'%' : '0%'],
      ['Absent (AA)', String(totalAbsent), totalPossible > 0 ? ((totalAbsent/totalPossible)*100).toFixed(1)+'%' : '0%'],
      ['C-Off', String(cOff), '-'],
      ['Holiday', String(holiday), '-'],
      [{ content: 'OT Days', styles: { textColor: [251, 146, 60] } }, { content: String(totalOTDays), styles: { textColor: [251, 146, 60] } }, { content: `${totalOT}h total`, styles: { textColor: [251, 146, 60] } }],
    ],
    theme: 'plain',
    styles: { fillColor: [15, 23, 42], textColor: [200, 210, 225], fontSize: 7, lineColor: [30, 41, 59], lineWidth: 0.2, cellPadding: 2.5 },
    headStyles: { fillColor: [22, 30, 48], textColor: [148, 163, 184], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [22, 30, 48] },
  });

  // Dept table (right)
  const deptMap = {};
  workers.forEach(w => {
    const dept = w.department || 'Unassigned';
    if (!deptMap[dept]) deptMap[dept] = { workers: 0, present: 0, absent: 0, ot: 0 };
    deptMap[dept].workers++;
    deptMap[dept].present += w.presentCount;
    deptMap[dept].absent += w.absentCount;
    deptMap[dept].ot += w.totalOtHours;
  });
  const deptRows = Object.entries(deptMap).sort((a, b) => a[0].localeCompare(b[0])).map(([name, d]) => {
    const att = d.workers * dates.length > 0 ? ((d.present / (d.workers * dates.length)) * 100).toFixed(1) : '0.0';
    return [
      name,
      String(d.workers),
      { content: String(d.present), styles: { textColor: [34, 197, 94] } },
      { content: String(d.absent), styles: { textColor: [248, 113, 113] } },
      { content: `${d.ot}h`, styles: { textColor: [251, 146, 60] } },
      { content: `${att}%`, styles: { textColor: [96, 165, 250], fontStyle: 'bold' } },
    ];
  });
  autoTable(doc, {
    startY: shiftTableY,
    margin: { left: 20 + halfW, right: 10 },
    head: [['Department', 'Workers', 'Present', 'Absent', 'OT', 'Att %']],
    body: deptRows,
    theme: 'plain',
    styles: { fillColor: [15, 23, 42], textColor: [200, 210, 225], fontSize: 7, lineColor: [30, 41, 59], lineWidth: 0.2, cellPadding: 2.5, halign: 'center' },
    headStyles: { fillColor: [22, 30, 48], textColor: [148, 163, 184], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [22, 30, 48] },
    columnStyles: { 0: { halign: 'left' } },
  });
}
