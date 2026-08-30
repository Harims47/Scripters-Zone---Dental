import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export interface ExportColumn {
  key: string;
  label: string;
}

export const generateCSV = (columns: ExportColumn[], data: any[]): string => {
  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = columns.map(c => escapeCsv(c.label)).join(',');
  const dataRows = data.map(row => {
    return columns.map(c => escapeCsv(row[c.key])).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

export const generateXLSX = async (columns: ExportColumn[], data: any[], sheetName: string = 'Data'): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = columns.map(c => ({
    header: c.label,
    key: c.key,
    width: 20
  }));

  data.forEach(row => {
    worksheet.addRow(row);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

export const generatePDF = (columns: ExportColumn[], data: any[], title: string, subtitle?: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const buffers: Buffer[] = [];
    
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Title
    doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });
    if (subtitle) {
      doc.fontSize(10).font('Helvetica').fillColor('gray').text(subtitle, { align: 'center' });
    }
    doc.moveDown(2);
    doc.fillColor('black');

    // Table Header
    let y = doc.y;
    const colWidth = (doc.page.width - 80) / columns.length;
    
    doc.fontSize(10).font('Helvetica-Bold');
    columns.forEach((c, i) => {
      doc.text(c.label, 40 + (i * colWidth), y, { width: colWidth, align: 'left' });
    });
    
    doc.moveTo(40, y + 15).lineTo(doc.page.width - 40, y + 15).stroke();
    y += 25;
    
    doc.font('Helvetica');
    data.forEach((row, rowIndex) => {
      // Check for page break
      let maxCellHeight = 0;
      
      // Calculate max height for this row
      columns.forEach((c, i) => {
        const val = row[c.key] === null || row[c.key] === undefined ? '' : String(row[c.key]);
        const h = doc.heightOfString(val, { width: colWidth - 10 });
        if (h > maxCellHeight) maxCellHeight = h;
      });

      if (y + maxCellHeight > doc.page.height - 50) {
        doc.addPage();
        y = 40;
        // Re-draw headers on new page
        doc.fontSize(10).font('Helvetica-Bold');
        columns.forEach((c, i) => {
          doc.text(c.label, 40 + (i * colWidth), y, { width: colWidth, align: 'left' });
        });
        doc.moveTo(40, y + 15).lineTo(doc.page.width - 40, y + 15).stroke();
        y += 25;
        doc.font('Helvetica');
      }

      columns.forEach((c, i) => {
        const val = row[c.key] === null || row[c.key] === undefined ? '' : String(row[c.key]);
        doc.text(val, 40 + (i * colWidth), y, { width: colWidth - 10, align: 'left' });
      });
      
      y += maxCellHeight + 5;
      
      // Add subtle row divider
      doc.lineWidth(0.5).strokeColor('#e2e8f0').moveTo(40, y - 2).lineTo(doc.page.width - 40, y - 2).stroke();
      doc.strokeColor('black'); // reset
    });

    doc.end();
  });
};
