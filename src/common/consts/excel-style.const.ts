export const EXCEL_STYLE = {
  title: {
    font: { size: 14, bold: true, color: { argb: 'FF004030' } },
    alignment: { vertical: 'middle', horizontal: 'center' } as any,
  },
  titleSmall: {
    font: { size: 12, bold: true, color: { argb: 'FF004030' } },
    alignment: { vertical: 'middle', horizontal: 'center' } as any,
  },
  content: {
    font: { size: 12, color: { argb: 'FF004030' } },
    fontBlack: { size: 12, color: { argb: 'FF222222' } },
    alignment: { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 } as any,
    alignmentImage: { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 7 } as any,
    alignmentRight: { vertical: 'middle', horizontal: 'right', wrapText: true, indent: 1 } as any,
  },
  header: {
    font: { size: 12, bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004030' } } as any,
    alignment: { horizontal: 'center', vertical: 'middle' } as any,
  },
  border: {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  } as any,
};
