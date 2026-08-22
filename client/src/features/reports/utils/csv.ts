/** Minimal CSV helper for report tables (UTF-8 with BOM for Excel). */

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const escape = (value: string | number | null | undefined): string => {
    const raw = value === null || value === undefined ? '' : String(value);
    if (/[",\n\r]/.test(raw)) {
      return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
  };

  const lines = [
    headers.map(escape).join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
