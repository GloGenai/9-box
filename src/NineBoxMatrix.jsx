import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

// Parsing utilities
const benefitIdx = { High: 0, Medium: 1, Low: 2 };
const feasIdx    = { Low: 0, Medium: 1, High: 2 };

function parseMatrixFromGrid(raw) {
  const rows = raw.trim().split(/\r?\n/)
                  .map(r => r.split(/\t|\s{2,}/).filter(Boolean));
  if (rows.length < 3) return null;

  // Remove Excel-like headers
  if (/benefits?/i.test(rows[0][0]) || rows[0][0] === '') rows.shift();
  if (rows[0].length === 4) rows.forEach(r => r.shift());

  // Build 3×3 array
  return Array.from({ length: 3 }, (_, i) =>
    Array.from({ length: 3 }, (_, j) => rows[i]?.[j] || '')
  );
}

function parseMatrixFromList(raw) {
  const out = Array.from({ length: 3 }, () => Array(3).fill(''));
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return out;

  const delim = /\t|;/;
  // Detect header row (ID, Benefit, Feasibility)
  const parts0 = lines[0].split(delim).map(s => s.trim().toLowerCase());
  const hasHeader = parts0.includes('id') && parts0.some(h => h.includes('benefit')) && parts0.some(h => h.includes('feas'));
  const dataLines = hasHeader ? lines.slice(1) : lines;

  dataLines.forEach(line => {
    const parts = line.split(delim).map(s => s.trim()).filter(Boolean);
    if (parts.length < 3) return;

    if (hasHeader) {
      // Assume ID, Benefit, Feasibility
      const [id, b, f] = parts;
      append(out, b, f, id);
    } else if (benefitIdx[parts[0]] != null && feasIdx[parts[1]] != null) {
      // Benefit, Feasibility, Title
      const [b, f, ...rest] = parts;
      append(out, b, f, rest.join(' '));
    } else {
      // Fallback: ID, Benefit, Feasibility
      const [id, b, f] = parts;
      append(out, b, f, id);
    }
  });

  return out;
}

function append(mat, b, f, val) {
  const r = benefitIdx[b], c = feasIdx[f];
  if (r == null || c == null || !val) return;
  mat[r][c] = mat[r][c] ? `${mat[r][c]}\n${val}` : val;
}

function splitMulti(mat) {
  return mat.map(row =>
    row.map(cell =>
      cell.split(/[,;\n]+/)
          .map(s => s.trim())
          .filter(Boolean)
          .join('\n')
    )
  );
}

// Rendering constants
const ROW_LABELS = ['High', 'Medium', 'Low'];
const COL_LABELS = ['Low', 'Medium', 'High'];

const getCellBg = (r, c) => {
  const score = (3 - r) + (c + 1);
  return score >= 6 ? 'bg-green-200'
       : score >= 4 ? 'bg-yellow-200'
                    : 'bg-red-200';
};

export default function NineBoxMatrix() {
  const [matrix, setMatrix] = useState(
    Array.from({ length: 3 }, () => Array(3).fill(''))
  );

  const handlePaste = e => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');

    // List-style paste first: ID⇥Benefit⇥Feasibility or Benefit⇥Feas⇥Title
    const listMat = parseMatrixFromList(text);
    const hasListEntries = listMat.flat().some(cell => cell);
    if (hasListEntries) {
      setMatrix(splitMulti(listMat));
      return;
    }

    // Otherwise try a raw 3×3 grid
    const grid = parseMatrixFromGrid(text);
    if (grid) {
      setMatrix(splitMulti(grid));
      return;
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-2">9-Box Matrix</h1>
      <p className="text-sm mb-4">
        Paste a 3×3 grid, Benefit⇥Feas⇥Title, or ID⇥Benefit⇥Feasibility
      </p>
      <p className="text-sm mb-4">
        <span className="font-semibold">Rows:</span> Benefit (High → Low) &nbsp;&nbsp;
        <span className="font-semibold">Columns:</span> Feasibility (Low → High)
      </p>

      <textarea
        onPaste={handlePaste}
        placeholder="Ctrl + V here…"
        className="w-full h-28 p-2 border rounded mb-6"
      />

      <div className="grid grid-cols-4 gap-px text-sm">
        {/* Column headers */}
        <div />
        {COL_LABELS.map(col => (
          <div key={`col-${col}`} className="text-center font-semibold">
            {col}
          </div>
        ))}

        {/* Rows */}
        {ROW_LABELS.map((row, r) => (
          <React.Fragment key={`row-${row}`}>  
            <div className="flex items-center justify-center font-semibold">
              {row}
            </div>
            {COL_LABELS.map((_, c) => (
              <div
                key={`cell-${r}-${c}`}
                className={`${getCellBg(r, c)} min-h-[70px] whitespace-pre-wrap p-2 border`}
              >
                {matrix[r][c]}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Mount the component
ReactDOM.createRoot(document.getElementById('root')).render(<NineBoxMatrix />);

