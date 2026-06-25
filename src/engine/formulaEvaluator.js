/**
 * Spreadsheet Formula Evaluation Engine
 * Supports cell references, ranges (e.g. A1:B3), basic arithmetic,
 * and functions: SUM, AVERAGE, MIN, MAX, COUNT.
 */

// Helper to check if a string represents a cell reference (e.g., A1, B12, Z99)
export const isCellReference = (str) => {
  return /^[A-Z][1-9][0-9]*$/.test(str.toUpperCase());
};

// Helper to convert cell coordinate (e.g., "A1") to indices { row, col }
export const cellToIndices = (cellId) => {
  const match = cellId.toUpperCase().match(/^([A-Z])([1-9][0-9]*)$/);
  if (!match) return null;
  const colStr = match[1];
  const rowStr = match[2];
  
  const col = colStr.charCodeAt(0) - 65; // A = 0, B = 1, ...
  const row = parseInt(rowStr, 10) - 1;  // 1-indexed to 0-indexed
  
  return { row, col };
};

// Helper to convert indices { row, col } to cell coordinate (e.g., "A1")
export const indicesToCell = (row, col) => {
  const colStr = String.fromCharCode(65 + col);
  const rowStr = String(row + 1);
  return `${colStr}${rowStr}`;
};

// Helper to expand a range string (e.g., "A1:B3") to an array of cell coordinates
export const expandRange = (rangeStr) => {
  const parts = rangeStr.split(':');
  if (parts.length !== 2) return [rangeStr];
  
  const start = cellToIndices(parts[0]);
  const end = cellToIndices(parts[1]);
  
  if (!start || !end) return [rangeStr];
  
  const startRow = Math.min(start.row, end.row);
  const endRow = Math.max(start.row, end.row);
  const startCol = Math.min(start.col, end.col);
  const endCol = Math.max(start.col, end.col);
  
  const cells = [];
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      cells.push(String.fromCharCode(65 + c) + (r + 1));
    }
  }
  return cells;
};

/**
 * Evaluates a cell formula
 * @param {string} rawValue - The cell raw input (e.g. "=SUM(A1:A3)" or "42")
 * @param {Object} cellsData - The current key-value cell store (e.g. { A1: { rawValue: "10" } })
 * @param {Set} visiting - Track visiting cell IDs to detect circular references
 */
export const evaluateFormula = (rawValue, cellsData = {}, visiting = new Set(), currentCellId = '') => {
  if (!rawValue || typeof rawValue !== 'string') return rawValue || '';
  if (!rawValue.startsWith('=')) return rawValue;
  
  // Detect circular reference
  if (currentCellId) {
    if (visiting.has(currentCellId)) {
      return '#REF! (Circular)';
    }
    visiting.add(currentCellId);
  }
  
  try {
    const formula = rawValue.substring(1).trim(); // Remove "="
    
    // Parse aggregate functions: SUM, AVERAGE, MIN, MAX, COUNT
    const funcMatch = formula.match(/^(SUM|AVERAGE|MIN|MAX|COUNT)\((.+)\)$/i);
    
    if (funcMatch) {
      const funcName = funcMatch[1].toUpperCase();
      const argsStr = funcMatch[2];
      
      // Split args by comma, expand ranges
      const args = argsStr.split(',').map(s => s.trim());
      const referencedCells = [];
      
      for (const arg of args) {
        if (arg.includes(':')) {
          referencedCells.push(...expandRange(arg));
        } else if (isCellReference(arg)) {
          referencedCells.push(arg.toUpperCase());
        } else {
          // It's a static number
          referencedCells.push(arg);
        }
      }
      
      const values = referencedCells.map(ref => {
        if (isCellReference(ref)) {
          const refCell = cellsData[ref];
          const evaluated = refCell 
            ? evaluateFormula(refCell.rawValue, cellsData, new Set(visiting), ref) 
            : '';
          
          if (typeof evaluated === 'string' && evaluated.startsWith('#')) return evaluated;
          const num = parseFloat(evaluated);
          return isNaN(num) ? 0 : num;
        } else {
          const num = parseFloat(ref);
          return isNaN(num) ? 0 : num;
        }
      });
      
      // If any of the evaluated cells return an error, bubble it up
      const err = values.find(v => typeof v === 'string' && v.startsWith('#'));
      if (err) return err;
      
      switch (funcName) {
        case 'SUM':
          return values.reduce((acc, v) => acc + v, 0);
        case 'AVERAGE':
          return values.length ? (values.reduce((acc, v) => acc + v, 0) / values.length) : 0;
        case 'MIN':
          return values.length ? Math.min(...values) : 0;
        case 'MAX':
          return values.length ? Math.max(...values) : 0;
        case 'COUNT':
          return values.length;
        default:
          return '#ERROR! (Unknown Function)';
      }
    }
    
    // Fallback: Check if it is a simple arithmetic equation (e.g. A1 + B2 * 5)
    // Replace all cell references with their evaluated values
    let expr = formula;
    const cellRegex = /\b([A-Z][1-9][0-9]*)\b/gi;
    let match;
    
    // Find all unique cell coordinates in the expression
    const referencedInExpr = [];
    while ((match = cellRegex.exec(formula)) !== null) {
      referencedInExpr.push(match[1].toUpperCase());
    }
    
    for (const ref of referencedInExpr) {
      const refCell = cellsData[ref];
      const val = refCell ? evaluateFormula(refCell.rawValue, cellsData, new Set(visiting), ref) : '0';
      if (typeof val === 'string' && val.startsWith('#')) return val;
      const num = parseFloat(val);
      expr = expr.replace(new RegExp('\\b' + ref + '\\b', 'gi'), isNaN(num) ? '0' : num.toString());
    }
    
    // Sanitize expression to prevent dangerous eval
    if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
      return '#ERROR! (Invalid Expression)';
    }
    
    // Evaluate safely using Function constructor
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${expr})`)();
    return typeof result === 'number' && !isNaN(result) ? result : '#ERROR!';
  } catch (e) {
    return '#ERROR! (Parsing)';
  } finally {
    if (currentCellId) {
      visiting.delete(currentCellId);
    }
  }
};
