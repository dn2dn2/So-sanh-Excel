import * as XLSX from 'xlsx';
import { ComparisonResult, ExcelRow, RowDiff, CellDiff } from '../types';

// Robust way to get functions regardless of import style (default vs named)
const getXLSX = () => {
  const lib = XLSX as any;
  // Check for named exports or default export structure
  const read = lib.read || (lib.default && lib.default.read);
  const utils = lib.utils || (lib.default && lib.default.utils);
  const writeFile = lib.writeFile || (lib.default && lib.default.writeFile);
  
  if (!read || !utils || !writeFile) {
      console.error("XLSX Library not loaded correctly", lib);
      throw new Error("Không thể tải thư viện xử lý Excel. Vui lòng tải lại trang.");
  }
  return { read, utils, writeFile };
};

export interface WorkbookData {
  workbook: any;
  sheetNames: string[];
  fileName: string;
}

export const readExcelWorkbook = async (file: File): Promise<WorkbookData> => {
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      throw new Error("Vui lòng chỉ tải lên file Excel (.xlsx hoặc .xls)");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const { read } = getXLSX();
        
        if (!e.target?.result) throw new Error("File rỗng");
        
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = read(data, { type: 'array', cellDates: true });
        
        if (workbook.SheetNames.length === 0) {
            throw new Error("File Excel không có sheet nào");
        }

        resolve({
          workbook,
          sheetNames: workbook.SheetNames,
          fileName: file.name
        });
      } catch (error: any) {
        console.error("Read Excel Error:", error);
        reject(new Error(error.message || "Lỗi khi đọc nội dung file Excel"));
      }
    };
    reader.onerror = (error) => reject(new Error("Lỗi khi đọc file"));
    reader.readAsArrayBuffer(file);
  });
};

export const getSheetData = (workbook: any, sheetName: string): ExcelRow[] => {
  const { utils } = getXLSX();
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return [];

  // Parse to JSON with header: 1 to treat first row as keys
  const jsonData = utils.sheet_to_json(worksheet, { defval: "" });
  return jsonData as ExcelRow[];
};

// Helper to find a primary key column (unique values)
const findPrimaryKey = (rows: ExcelRow[], headers: string[]): string | null => {
    if (rows.length === 0) return null;
    
    // Candidates: ID, Code, Mã, SKU, etc.
    const candidates = headers.filter(h => 
        /id|code|mã|sku|key|stt|email|số phiếu/i.test(h)
    );

    // Check candidates for uniqueness
    for (const key of candidates) {
        const values = new Set();
        let isUnique = true;
        let hasData = false;

        for (const row of rows) {
            const val = row[key];
            // Skip empty keys, considered invalid for PK
            if (val === undefined || val === "" || val === null) {
                continue;
            }
            hasData = true;
            if (values.has(val)) {
                isUnique = false;
                break;
            }
            values.add(val);
        }
        // Must have some data and be unique
        if (isUnique && hasData && values.size > rows.length * 0.8) return key;
    }

    return null;
};

// Calculate similarity between two rows (0 to 1)
const calculateSimilarity = (row1: ExcelRow, row2: ExcelRow, headers: string[]): number => {
    if (!row1 || !row2) return 0;
    let matches = 0;
    let total = 0;
    headers.forEach(h => {
        total++;
        const v1 = row1[h] ? String(row1[h]).trim() : "";
        const v2 = row2[h] ? String(row2[h]).trim() : "";
        if (v1 === v2) matches++;
    });
    return total === 0 ? 0 : matches / total;
};

export const compareExcelData = (oldData: ExcelRow[], newData: ExcelRow[]): ComparisonResult => {
  if (!oldData) oldData = [];
  if (!newData) newData = [];

  // 1. Determine superset of headers
  const oldHeaders = oldData.length > 0 ? Object.keys(oldData[0]) : [];
  const newHeaders = newData.length > 0 ? Object.keys(newData[0]) : [];
  const allHeaders = Array.from(new Set([...oldHeaders, ...newHeaders])).filter(h => h !== '__rowNum__');

  const rows: RowDiff[] = [];
  let modifiedCellsCount = 0;
  let modifiedRowsCount = 0;
  
  // 2. Try to identify rows by a unique key
  const primaryKey = findPrimaryKey(oldData, oldHeaders) || findPrimaryKey(newData, newHeaders);
  
  if (primaryKey) {
      // --- ALIGNMENT BY PRIMARY KEY ---
      const oldMap = new Map<string, {row: ExcelRow, index: number}>();
      oldData.forEach((r, i) => {
          const key = r[primaryKey] ? String(r[primaryKey]).trim() : `__empty_${i}`;
          oldMap.set(key, {row: r, index: i});
      });

      const newMap = new Map<string, {row: ExcelRow, index: number}>();
      newData.forEach((r, i) => {
          const key = r[primaryKey] ? String(r[primaryKey]).trim() : `__empty_${i}`;
          newMap.set(key, {row: r, index: i});
      });

      // Use a Set to track processed keys to avoid duplicates if structure is messy
      const processedKeys = new Set<string>();
      let rowId = 0;

      // We iterate based on a merged list of keys to try and preserve order
      // This is a simple merge, a perfect topological sort is complex
      const allKeys: string[] = [];
      
      // Heuristic: Interleave keys
      let i = 0, j = 0;
      while(i < oldData.length || j < newData.length) {
          const k1 = i < oldData.length ? (oldData[i][primaryKey] ? String(oldData[i][primaryKey]).trim() : `__empty_${i}`) : null;
          const k2 = j < newData.length ? (newData[j][primaryKey] ? String(newData[j][primaryKey]).trim() : `__empty_${j}`) : null;
          
          if (k1 && !processedKeys.has(k1)) {
              allKeys.push(k1);
              processedKeys.add(k1);
          }
          if (k2 && !processedKeys.has(k2)) {
              allKeys.push(k2);
              processedKeys.add(k2);
          }
          i++; j++;
      }

      // Reset for processing
      processedKeys.clear();

      // Iterate and Compare
      for (const key of allKeys) {
          if (processedKeys.has(key)) continue;
          processedKeys.add(key);

          const oldItem = oldMap.get(key);
          const newItem = newMap.get(key);

          const rowCells: { [key: string]: CellDiff } = {};
          
          if (oldItem && newItem) {
              // Exists in both -> Check for modifications
              let isRowModified = false;
              allHeaders.forEach(header => {
                  const oldVal = oldItem.row[header];
                  const newVal = newItem.row[header];
                  const sOld = oldVal === undefined || oldVal === null ? "" : String(oldVal).trim();
                  const sNew = newVal === undefined || newVal === null ? "" : String(newVal).trim();

                  if (sOld !== sNew) {
                       rowCells[header] = { value: newVal, oldValue: oldVal, status: 'modified' };
                       isRowModified = true;
                       modifiedCellsCount++;
                  } else {
                      rowCells[header] = { value: newVal, status: 'same' };
                  }
              });

              rows.push({ 
                  id: rowId++, 
                  oldRowNumber: oldItem.index + 2, 
                  newRowNumber: newItem.index + 2,
                  cells: rowCells, 
                  status: isRowModified ? 'modified' : 'same' 
              });
              if (isRowModified) modifiedRowsCount++;

          } else if (newItem) {
              // Added
               allHeaders.forEach(header => {
                  rowCells[header] = { value: newItem.row[header], status: 'added' };
              });
              rows.push({ id: rowId++, newRowNumber: newItem.index + 2, cells: rowCells, status: 'added' });
          } else if (oldItem) {
              // Removed
              allHeaders.forEach(header => {
                  rowCells[header] = { value: oldItem.row[header], status: 'removed' };
              });
              rows.push({ id: rowId++, oldRowNumber: oldItem.index + 2, cells: rowCells, status: 'removed' });
          }
      }

  } else {
      // --- FALLBACK: SMART CONTENT SCANNING (No ID) ---
      // Handle insertions/deletions by looking ahead
      let i = 0; // old ptr
      let j = 0; // new ptr
      let rowId = 0;

      while (i < oldData.length || j < newData.length) {
          const oldRow = i < oldData.length ? oldData[i] : null;
          const newRow = j < newData.length ? newData[j] : null;

          if (!oldRow && newRow) {
              // Remainder of new are additions
               const rowCells: any = {};
               allHeaders.forEach(h => rowCells[h] = { value: newRow[h], status: 'added' });
               rows.push({ id: rowId++, newRowNumber: j + 2, cells: rowCells, status: 'added' });
               j++;
               continue;
          }
          
          if (oldRow && !newRow) {
              // Remainder of old are removals
               const rowCells: any = {};
               allHeaders.forEach(h => rowCells[h] = { value: oldRow[h], status: 'removed' });
               rows.push({ id: rowId++, oldRowNumber: i + 2, cells: rowCells, status: 'removed' });
               i++;
               continue;
          }

          // Compare current rows
          const similarity = calculateSimilarity(oldRow!, newRow!, allHeaders);

          if (similarity > 0.8) {
              // Case 1: Very similar (likely the same row, maybe minor edit)
              // Treat as MATCH/MODIFY
              const rowCells: any = {};
              let isMod = false;
              allHeaders.forEach(header => {
                  const oldVal = oldRow![header];
                  const newVal = newRow![header];
                  const sOld = oldVal === undefined || oldVal === null ? "" : String(oldVal).trim();
                  const sNew = newVal === undefined || newVal === null ? "" : String(newVal).trim();

                  if (sOld !== sNew) {
                      rowCells[header] = { value: newVal, oldValue: oldVal, status: 'modified' };
                      isMod = true;
                      modifiedCellsCount++;
                  } else {
                      rowCells[header] = { value: newVal, status: 'same' };
                  }
              });
              rows.push({ id: rowId++, oldRowNumber: i+2, newRowNumber: j+2, cells: rowCells, status: isMod ? 'modified' : 'same' });
              if (isMod) modifiedRowsCount++;
              i++; j++;
          } else {
              // Case 2: Not similar. Is it an insertion or deletion?
              // Look ahead in New Data for Old Row
              let foundInNewAt = -1;
              for (let k = 1; k <= 5 && (j + k) < newData.length; k++) {
                  if (calculateSimilarity(oldRow!, newData[j + k], allHeaders) > 0.8) {
                      foundInNewAt = j + k;
                      break;
                  }
              }

              // Look ahead in Old Data for New Row
              let foundInOldAt = -1;
              for (let k = 1; k <= 5 && (i + k) < oldData.length; k++) {
                  if (calculateSimilarity(oldData[i + k], newRow!, allHeaders) > 0.8) {
                      foundInOldAt = i + k;
                      break;
                  }
              }

              if (foundInNewAt !== -1 && (foundInOldAt === -1 || foundInNewAt < foundInOldAt)) {
                   // Old Row found later in New Data -> The rows in between are ADDED
                   // Process current NEW row as Added
                   const rowCells: any = {};
                   allHeaders.forEach(h => rowCells[h] = { value: newRow![h], status: 'added' });
                   rows.push({ id: rowId++, newRowNumber: j + 2, cells: rowCells, status: 'added' });
                   j++;
              } else if (foundInOldAt !== -1) {
                   // New Row found later in Old Data -> The rows in between are REMOVED
                   // Process current OLD row as Removed
                   const rowCells: any = {};
                   allHeaders.forEach(h => rowCells[h] = { value: oldRow![h], status: 'removed' });
                   rows.push({ id: rowId++, oldRowNumber: i + 2, cells: rowCells, status: 'removed' });
                   i++;
              } else {
                   // Neither found nearby. Treat as Modified (or Replace) to keep alignment
                   const rowCells: any = {};
                   let isMod = false;
                   allHeaders.forEach(header => {
                       const oldVal = oldRow![header];
                       const newVal = newRow![header];
                       const sOld = oldVal === undefined || oldVal === null ? "" : String(oldVal).trim();
                       const sNew = newVal === undefined || newVal === null ? "" : String(newVal).trim();

                       if (sOld !== sNew) {
                           rowCells[header] = { value: newVal, oldValue: oldVal, status: 'modified' };
                           isMod = true;
                           modifiedCellsCount++;
                       } else {
                           rowCells[header] = { value: newVal, status: 'same' };
                       }
                   });
                   rows.push({ id: rowId++, oldRowNumber: i+2, newRowNumber: j+2, cells: rowCells, status: 'modified' });
                   modifiedRowsCount++;
                   i++; j++;
              }
          }
      }
  }

  return {
    headers: allHeaders,
    rows,
    summary: {
      totalRows: rows.length,
      addedRows: rows.filter(r => r.status === 'added').length,
      removedRows: rows.filter(r => r.status === 'removed').length,
      modifiedRows: modifiedRowsCount,
      modifiedCells: modifiedCellsCount
    }
  };
};

export const exportComparisonToExcel = (comparison: ComparisonResult) => {
  const { utils, writeFile } = getXLSX();

  // Build the data structure for export (Side by Side)
  const exportData: any[][] = [];

  // Row 1: Meta Headers
  const metaHeader = [
    "Dòng cũ",
    "Dòng mới",
    "Trạng thái",
    ...comparison.headers.map(() => "Dữ liệu cũ"),
    "", // Separator
    ...comparison.headers.map(() => "Dữ liệu mới")
  ];
  exportData.push(metaHeader);

  // Row 2: Column Headers
  const colHeader = [
    "#", "#",
    "Chi tiết", 
    ...comparison.headers, 
    "|", // Separator visual
    ...comparison.headers
  ];
  exportData.push(colHeader);

  // Rows
  comparison.rows.forEach(row => {
    let statusText = "";
    if (row.status === 'added') statusText = "Mới thêm";
    else if (row.status === 'removed') statusText = "Đã xóa";
    else if (row.status === 'modified') statusText = "Sửa đổi";
    
    // Prepare Old Data Row
    const oldRowData = comparison.headers.map(header => {
        if (row.status === 'added') return ""; 
        const cell = row.cells[header];
        return cell.oldValue !== undefined ? cell.oldValue : (cell.status === 'same' || cell.status === 'removed' ? cell.value : "");
    });

    // Prepare New Data Row
    const newRowData = comparison.headers.map(header => {
        if (row.status === 'removed') return ""; 
        const cell = row.cells[header];
        return cell.value;
    });

    exportData.push([
        row.oldRowNumber || "", 
        row.newRowNumber || "", 
        statusText, 
        ...oldRowData, 
        "|", 
        ...newRowData
    ]);
  });

  // Create Workbook
  const ws = utils.aoa_to_sheet(exportData);
  
  // Auto-width columns (Approximation)
  const wscols = [
      { wch: 8 }, // Old Row
      { wch: 8 }, // New Row
      { wch: 15 }, // Status
      ...comparison.headers.map(() => ({ wch: 15 })), 
      { wch: 3 },  
      ...comparison.headers.map(() => ({ wch: 15 }))  
  ];
  ws['!cols'] = wscols;

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Báo cáo So sánh");

  // Write File
  writeFile(wb, `Bao_cao_so_sanh_${new Date().toISOString().slice(0,10)}.xlsx`);
};