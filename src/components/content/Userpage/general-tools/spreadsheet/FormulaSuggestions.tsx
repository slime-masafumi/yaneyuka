'use client';

import React from 'react';

interface FormulaSuggestionsProps {
  suggestions: string[];
  onSelect: (fnName: string) => void;
  position: { top: number; left: number };
}

const FormulaSuggestions: React.FC<FormulaSuggestionsProps> = ({
  suggestions,
  onSelect,
  position,
}) => {
  if (suggestions.length === 0) return null;

  return (
    <ul
      className="absolute z-50 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto"
      style={{ top: position.top, left: position.left }}
    >
      {suggestions.map((fn, index) => (
        <li
          key={fn}
          className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(fn);
          }}
        >
          {fn}
        </li>
      ))}
    </ul>
  );
};

export default FormulaSuggestions;

