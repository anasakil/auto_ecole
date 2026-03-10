export function exportToCSV(data, columns, filename) {
  if (!data || data.length === 0) return;

  const headers = columns.map(col => col.header || col.key);
  const rows = data.map(row =>
    columns.map(col => {
      let value = col.exportValue ? col.exportValue(row) : row[col.key];
      if (value === null || value === undefined) value = '';
      value = String(value).replace(/"/g, '""');
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value}"`;
      }
      return value;
    })
  );

  const csvContent = [
    '\uFEFF' + headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename || 'export'}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPDF(data, columns, title, filename, options = {}) {
  if (!data || data.length === 0) return;

  const { subtitle, orientation = 'portrait' } = options;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const headers = columns.map(col => col.header || col.key);
  const rows = data.map(row =>
    columns.map(col => {
      let value = col.exportValue ? col.exportValue(row) : row[col.key];
      if (value === null || value === undefined) value = '';
      return String(value);
    })
  );

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title || 'Export'}</title>
      <style>
        @page { size: ${orientation}; margin: 1cm; }
        body { font-family: Arial, sans-serif; font-size: 10px; margin: 0; padding: 20px; }
        h1 { font-size: 16px; margin-bottom: 5px; }
        .subtitle { font-size: 12px; color: #666; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; padding: 8px 6px; text-align: left; font-weight: bold; border: 1px solid #ddd; font-size: 9px; }
        td { padding: 6px; border: 1px solid #ddd; font-size: 9px; }
        tr:nth-child(even) { background: #f9fafb; }
        .footer { margin-top: 15px; font-size: 8px; color: #999; text-align: center; }
      </style>
    </head>
    <body>
      <h1>${title || 'Export'}</h1>
      ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
      <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
      <div class="footer">Généré le ${new Date().toLocaleDateString('fr-FR')} - ${data.length} enregistrement(s)</div>
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
