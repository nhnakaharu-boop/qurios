'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const SYMBOL_GROUPS = {
  '数学': ['∫', '∬', '∭', '∮', '∯', '√', '∛', '∜', 'Σ', 'Π', 'Δ', '∂', '∇', '∞', '≈', '≡', '≠', '≤', '≥', '±', '×', '÷', '∝', '∠', '⊥', '∥', '→', '⇒', '⇔', '∈', '∉', '⊂', '⊃', '∪', '∩', '∀', '∃', 'ℝ', 'ℤ', 'ℚ', 'ℕ'],
  '物理': ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'λ', 'μ', 'ν', 'ξ', 'π', 'ρ', 'σ', 'τ', 'φ', 'χ', 'ψ', 'ω', 'Α', 'Β', 'Γ', 'Δ', 'Ε', 'Θ', 'Λ', 'Ξ', 'Π', 'Σ', 'Φ', 'Χ', 'Ψ', 'Ω'],
  '化学': ['→', '⇌', '⇒', '↑', '↓', '°', 'Å', '·', '⁺', '⁻', '⁰', '¹', '²', '³', '⁴', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉', '₀'],
  '上付き': ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', 'ⁿ', 'ⁱ', 'ᵃ', 'ᵇ', 'ᶜ'],
  '下付き': ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉', 'ₙ'],
};

interface Props {
  onInsert: (symbol: string) => void;
  className?: string;
}

export default function SymbolBar({ onInsert, className = '' }: Props) {
  const [activeGroup, setActiveGroup] = useState<string>('数学');
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border border-[--border] rounded-[10px] overflow-hidden bg-[--surface2] ${className}`}>
      {/* Group tabs */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[--border]">
        <div className="flex gap-1 overflow-x-auto">
          {Object.keys(SYMBOL_GROUPS).map(g => (
            <button key={g} onClick={() => setActiveGroup(g)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-[6px] cursor-pointer border-none whitespace-nowrap transition-colors ${activeGroup === g ? 'bg-[--blue] text-white' : 'bg-transparent text-[--text3] hover:bg-[--border]'}`}>
              {g}
            </button>
          ))}
        </div>
        <button onClick={() => setExpanded(p => !p)} className="text-[--text3] border-none bg-transparent cursor-pointer ml-2 flex-shrink-0">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {/* Symbols */}
      <div className={`flex flex-wrap gap-1 p-2 transition-all ${expanded ? '' : 'max-h-[52px] overflow-hidden'}`}>
        {(SYMBOL_GROUPS[activeGroup as keyof typeof SYMBOL_GROUPS] ?? []).map(s => (
          <button key={s} onClick={() => onInsert(s)}
            className="w-8 h-8 rounded-[6px] text-sm font-mono bg-[--surface] border border-[--border] cursor-pointer hover:bg-[--blue] hover:text-white hover:border-[--blue] transition-all active:scale-95 flex-shrink-0">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
