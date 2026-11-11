import React, { useState } from 'react';
import { Calculator, X } from 'lucide-react';

interface ScientificCalculatorProps {
  onClose: () => void;
}

export const ScientificCalculator: React.FC<ScientificCalculatorProps> = ({ onClose }) => {
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('0');
  const [angleMode, setAngleMode] = useState<'DEG' | 'RAD'>('DEG');

  const evaluateExpression = (raw: string) => {
    try {
      if (!raw.trim()) {
        setResult('0');
        return;
      }
      const toRad = angleMode === 'DEG' ? '* (Math.PI / 180)' : '';
      const transformed = raw
        .replace(/π/g, 'Math.PI')
        .replace(/\be\b/g, 'Math.E')
        .replace(/\^/g, '**')
        .replace(/√\(/g, 'Math.sqrt(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/sin\(([^)]+)\)/g, `Math.sin(($1)${toRad})`)
        .replace(/cos\(([^)]+)\)/g, `Math.cos(($1)${toRad})`)
        .replace(/tan\(([^)]+)\)/g, `Math.tan(($1)${toRad})`);

      // Restrict allowed characters before Function evaluation
      if (!/^[0-9+\-*/().,\sA-Za-z_]+$/.test(transformed)) {
        setResult('Invalid');
        return;
      }
      // eslint-disable-next-line no-new-func
      const val = Function(`"use strict"; return (${transformed});`)();
      if (typeof val === 'number' && Number.isFinite(val)) {
        setResult(Number(val.toPrecision(10)).toString());
      } else {
        setResult('Error');
      }
    } catch {
      setResult('Error');
    }
  };

  const append = (token: string) => {
    setExpr((prev) => prev + token);
  };

  const buttons = [
    ['sin(', 'cos(', 'tan(', '(', ')'],
    ['ln(', 'log(', '√(', '^', 'π'],
    ['7', '8', '9', '/', 'DEL'],
    ['4', '5', '6', '*', 'C'],
    ['1', '2', '3', '-', 'e'],
    ['0', '.', '+', '=', 'ANS'],
  ];

  return (
    <div className="fixed bottom-4 left-4 z-50 w-80 rounded-2xl border border-slate-700 bg-navy-900 text-slate-100 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-navy-800 border-b border-slate-700/70">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold tracking-wide">GATE Virtual Calculator</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAngleMode((m) => (m === 'DEG' ? 'RAD' : 'DEG'))}
            className="px-2 py-0.5 text-[11px] font-semibold rounded bg-blue-500/20 text-blue-300 border border-blue-500/40"
          >
            {angleMode}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            aria-label="Close calculator"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-3 bg-navy-950/90 border-b border-slate-800">
        <input
          type="text"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') evaluateExpression(expr);
          }}
          placeholder="Enter expression..."
          className="w-full bg-transparent text-right text-sm font-mono text-slate-300 focus:outline-none"
        />
        <div className="text-right text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums truncate">
          {result}
        </div>
      </div>

      <div className="p-2.5 grid grid-cols-5 gap-1.5">
        {buttons.flat().map((btn) => {
          const isEquals = btn === '=';
          const isClear = btn === 'C' || btn === 'DEL';
          return (
            <button
              key={btn}
              type="button"
              onClick={() => {
                if (btn === 'C') {
                  setExpr('');
                  setResult('0');
                } else if (btn === 'DEL') {
                  setExpr((p) => p.slice(0, -1));
                } else if (btn === '=') {
                  evaluateExpression(expr);
                } else if (btn === 'ANS') {
                  setExpr((p) => p + result);
                } else {
                  append(btn);
                }
              }}
              className={`py-2 rounded-lg text-xs font-semibold transition ${
                isEquals
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : isClear
                    ? 'bg-slate-700 hover:bg-slate-600 text-amber-300'
                    : 'bg-navy-800 hover:bg-navy-700 text-slate-200'
              }`}
            >
              {btn}
            </button>
          );
        })}
      </div>
    </div>
  );
};

