import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Delete, 
  Copy, 
  Check, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Clock,
  RotateCcw
} from 'lucide-react';
import { HistoryItem, CalculatorMode, AngleUnit } from './types';
import { evaluateExpression } from './utils/mathEvaluator';
import HistoryPanel from './components/HistoryPanel';

export default function App() {
  const [expression, setExpression] = useState<string>('');
  const [result, setResult] = useState<string>('0');
  const [isCalculated, setIsCalculated] = useState<boolean>(false);
  const [angleUnit, setAngleUnit] = useState<AngleUnit>('deg');
  const [mode, setMode] = useState<CalculatorMode>('standard');
  
  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  
  // Copy state feedback
  const [copied, setCopied] = useState<boolean>(false);
  
  // Show scientific help tips card
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // References for scroll positioning
  const displayEndRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('calc_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading history:', e);
      }
    }
  }, []);

  // Save history to localStorage
  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem('calc_history', JSON.stringify(newHistory));
  };

  // Scroll active display to the right when expression updates
  useEffect(() => {
    if (displayEndRef.current) {
      displayEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
    }
  }, [expression]);

  const isOperator = (char: string) => ['+', '-', '×', '÷', '^', '%'].includes(char);

  const handleInput = useCallback((value: string) => {
    setCopied(false);
    
    setExpression((prev) => {
      // If we just calculated and user inputs a digit, start fresh
      if (isCalculated) {
        setIsCalculated(false);
        if (!isNaN(Number(value)) || value === 'π' || value === 'e' || ['sin(', 'cos(', 'tan(', 'log(', 'ln(', '√(', '('].includes(value)) {
          return value;
        }
        // If they click an operator, keep previous result as base
        if (isOperator(value)) {
          return result + value;
        }
      }

      // Handle initial zero substitution
      if (prev === '0' || prev === '') {
        if (!isNaN(Number(value)) || value === 'π' || value === 'e') {
          return value;
        }
        if (value === '.') {
          return '0.';
        }
      }

      // Handle double operator substitution (e.g. replacing + with ×)
      const lastChar = prev.slice(-1);
      if (isOperator(lastChar) && isOperator(value)) {
        // Exception: allow negative sign after multiplier or divider
        if (value === '-' && ['×', '÷', '^'].includes(lastChar)) {
          return prev + value;
        }
        // Replace previous operator
        return prev.slice(0, -1) + value;
      }

      // Avoid double decimal points in a single term
      if (value === '.') {
        // Find last number term
        const parts = prev.split(/[\+\-\×\÷\^\(\)\%]/);
        const lastPart = parts[parts.length - 1];
        if (lastPart.includes('.')) {
          return prev; // ignore double dot
        }
      }

      return prev + value;
    });
  }, [isCalculated, result]);

  const handleClear = () => {
    setExpression('');
    setResult('0');
    setIsCalculated(false);
    setCopied(false);
  };

  const handleDelete = () => {
    setCopied(false);
    if (isCalculated) {
      setIsCalculated(false);
      setExpression('');
      return;
    }
    setExpression((prev) => {
      if (prev.length === 0) return '';
      
      // Check for multi-character functions at the end to delete them atomically
      const functions = ['sin(', 'cos(', 'tan(', 'log(', 'ln(', 'sqrt('];
      for (const func of functions) {
        if (prev.endsWith(func)) {
          return prev.slice(0, -func.length);
        }
      }
      
      // Check for scientific constants with parenthesized representations if any
      return prev.slice(0, -1);
    });
  };

  const handleCalculate = () => {
    if (!expression || expression.trim() === '') return;

    const evaluated = evaluateExpression(expression, angleUnit);
    setResult(evaluated);
    setIsCalculated(true);

    if (evaluated !== 'Hata') {
      // Add to history
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        expression,
        result: evaluated,
        timestamp: Date.now(),
      };
      const updatedHistory = [newItem, ...history].slice(0, 50); // limit to last 50 items
      saveHistory(updatedHistory);
    }
  };

  const handleClearHistory = () => {
    saveHistory([]);
  };

  const handleSelectHistoryItem = (expr: string) => {
    setExpression(expr);
    setIsCalculated(false);
    setIsHistoryOpen(false);
  };

  const handleCopyResult = () => {
    if (result && result !== 'Hata') {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Keyboard events listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key;
      
      if (key >= '0' && key <= '9') {
        handleInput(key);
      } else if (key === '.' || key === ',') {
        handleInput('.');
      } else if (key === '+') {
        handleInput('+');
      } else if (key === '-') {
        handleInput('-');
      } else if (key === '*') {
        handleInput('×');
      } else if (key === '/') {
        e.preventDefault();
        handleInput('÷');
      } else if (key === '%') {
        handleInput('%');
      } else if (key === '^') {
        handleInput('^');
      } else if (key === '(' || key === ')') {
        handleInput(key);
      } else if (key === '!') {
        handleInput('!');
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        handleCalculate();
      } else if (key === 'Backspace') {
        handleDelete();
      } else if (key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [expression, angleUnit, handleInput, isCalculated]);

  // Live preview evaluation (dimmed, under input)
  const getLivePreview = (): string | null => {
    if (!expression || isCalculated || expression.trim() === '') return null;
    
    // Check if there are operators or functions to justify a preview
    const hasOperators = /[\+\-\×\÷\^\!\%]/.test(expression) || 
                         /(sin|cos|tan|log|ln|√)/.test(expression);
    
    if (!hasOperators) return null;

    // Check if the expression is syntactically ready for safe parsing
    const lastChar = expression.slice(-1);
    if (isOperator(lastChar) || lastChar === '(') return null;

    const evaluated = evaluateExpression(expression, angleUnit);
    if (evaluated === 'Hata') return null;
    return evaluated;
  };

  const livePreview = getLivePreview();

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-gray-800 flex flex-col justify-between items-center p-4 md:p-8 font-sans">
      
      {/* Background decoration - elegant, organic, minimalist */}
      <div className="absolute top-0 left-0 w-full h-96 bg-linear-to-b from-white to-transparent opacity-60 pointer-events-none z-0" />

      {/* Main Container */}
      <div className="w-full max-w-lg mx-auto z-10 flex flex-col items-center flex-1 justify-center space-y-6">
        
        {/* App Branding & Controls */}
        <div className="w-full flex justify-between items-center px-2">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
              Hesap Makinesi
            </h1>
            <p className="text-xs text-gray-500">Temel ve Bilimsel İşlemler</p>
          </div>

          <div className="flex items-center gap-2">
            {/* History Toggle */}
            <button
              id="btn-toggle-history"
              onClick={() => setIsHistoryOpen(true)}
              className="relative p-2.5 bg-white hover:bg-gray-100 border border-gray-200/80 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center"
              title="Hesaplama Geçmişi"
            >
              <History className="w-4 h-4 text-gray-600" />
              {history.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-[10px] text-white font-bold flex items-center justify-center rounded-full border border-white">
                  {history.length}
                </span>
              )}
            </button>

            {/* Scientific Tips Toggle */}
            <button
              id="btn-toggle-help"
              onClick={() => setShowHelp((prev) => !prev)}
              className={`p-2.5 rounded-xl border transition-all shadow-xs cursor-pointer flex items-center justify-center ${
                showHelp 
                  ? 'bg-emerald-500 border-emerald-500 text-white' 
                  : 'bg-white hover:bg-gray-100 border-gray-200/80 text-gray-600'
              }`}
              title="Bilimsel Fonksiyon Rehberi"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Help Card */}
        <AnimatePresence>
          {showHelp && (
            <motion.div
              id="help-card"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full overflow-hidden"
            >
              <div className="bg-emerald-50/80 border border-emerald-100 p-4 rounded-2xl text-xs text-emerald-800 space-y-2">
                <div className="font-semibold text-sm flex items-center gap-1.5 text-emerald-900">
                  <span>💡 Fonksiyon Kullanım Kılavuzu</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
                  <div><strong className="text-emerald-900 font-sans">sin(x)</strong>: Trigonometrik Sinüs</div>
                  <div><strong className="text-emerald-900 font-sans">cos(x)</strong>: Trigonometrik Kosinüs</div>
                  <div><strong className="text-emerald-900 font-sans">tan(x)</strong>: Trigonometrik Tanjant</div>
                  <div><strong className="text-emerald-900 font-sans">xʸ</strong>: x üzeri y (Örn: 2^3)</div>
                  <div><strong className="text-emerald-900 font-sans">log(x)</strong>: Onluk Logaritma (Base 10)</div>
                  <div><strong className="text-emerald-900 font-sans">ln(x)</strong>: Doğal Logaritma (Base e)</div>
                  <div><strong className="text-emerald-900 font-sans">n!</strong>: Faktöriyel (Örn: 5!)</div>
                  <div><strong className="text-emerald-900 font-sans">√</strong>: Karekök alma</div>
                </div>
                <p className="text-[10px] text-emerald-700 font-sans pt-1 border-t border-emerald-200/50">
                  * Klavye desteği aktiftir. İşlemlerinizi doğrudan yazabilirsiniz. <strong className="font-semibold">DEG/RAD</strong> butonu ile trigonometri birimini ayarlayabilirsiniz.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Calculator Main Unit */}
        <div id="calculator-card" className="w-full bg-white border border-gray-100 rounded-3xl shadow-xl p-5 md:p-6 space-y-5 relative overflow-hidden">
          
          {/* Mode Switcher Inside the Card */}
          <div className="flex items-center justify-between">
            <div className="bg-gray-100 p-1 rounded-xl flex">
              <button
                id="btn-mode-standard"
                onClick={() => setMode('standard')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'standard'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Standart
              </button>
              <button
                id="btn-mode-scientific"
                onClick={() => setMode('scientific')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'scientific'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Bilimsel
              </button>
            </div>

            {/* Angle unit toggle (Only visible or active in scientific mode) */}
            <div className="flex items-center gap-1.5">
              <AnimatePresence mode="wait">
                {mode === 'scientific' && (
                  <motion.button
                    id="btn-toggle-angle"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setAngleUnit((prev) => prev === 'deg' ? 'rad' : 'deg')}
                    className="px-2.5 py-1 text-[10px] font-extrabold tracking-wider bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 rounded-lg transition-all cursor-pointer uppercase"
                  >
                    {angleUnit}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Calculator Display */}
          <div id="calc-display-container" className="bg-gray-50/60 border border-gray-100 rounded-2xl p-4 md:p-5 flex flex-col justify-between min-h-[140px] relative">
            
            {/* Display Top Metadata Row */}
            <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {mode === 'scientific' ? `BİLİMSEL (${angleUnit.toUpperCase()})` : 'STANDART'}
              </span>
              
              <div className="flex items-center gap-1.5">
                {result !== 'Hata' && result !== '0' && (
                  <button
                    id="btn-copy-result"
                    onClick={handleCopyResult}
                    className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 rounded-md transition-colors cursor-pointer"
                    title="Sonucu Kopyala"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
                {expression.length > 0 && (
                  <button
                    id="btn-backspace"
                    onClick={handleDelete}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                    title="Sil"
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Active Formula/Expression Display */}
            <div className="w-full overflow-x-auto whitespace-nowrap text-right text-gray-400 font-mono text-base md:text-lg tracking-wide py-2 scrollbar-none min-h-[36px]">
              {expression ? (
                <span className="text-gray-700">
                  {expression}
                  <span className="text-emerald-500 font-bold animate-pulse">|</span>
                </span>
              ) : (
                <span className="text-gray-300">0</span>
              )}
              <div ref={displayEndRef} />
            </div>

            {/* Evaluated Value Output */}
            <div className="text-right flex flex-col items-end justify-end mt-1 overflow-hidden">
              {/* Live Preview (Dimmed, only when typing valid formula) */}
              {livePreview && (
                <div className="text-xs font-mono text-emerald-600/70 select-none pb-0.5 animate-fade-in">
                  ≈ {livePreview}
                </div>
              )}
              
              <div className="w-full font-mono text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 truncate select-all">
                {result}
              </div>
            </div>
          </div>

          {/* Calculator Grid Layout */}
          <div className="grid grid-cols-4 gap-2.5">
            
            {/* Scientific Drawer Section - Animated slide in */}
            <AnimatePresence>
              {mode === 'scientific' && (
                <motion.div
                  id="scientific-grid-panel"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="col-span-4 grid grid-cols-5 gap-2 pb-2.5 border-b border-gray-100"
                >
                  {[
                    { label: 'sin', action: () => handleInput('sin(') },
                    { label: 'cos', action: () => handleInput('cos(') },
                    { label: 'tan', action: () => handleInput('tan(') },
                    { label: 'xʸ', action: () => handleInput('^') },
                    { label: 'log', action: () => handleInput('log(') },
                    { label: 'ln', action: () => handleInput('ln(') },
                    { label: '√', action: () => handleInput('√(') },
                    { label: 'n!', action: () => handleInput('!') },
                    { label: 'π', action: () => handleInput('π') },
                    { label: 'e', action: () => handleInput('e') },
                  ].map((btn) => (
                    <motion.button
                      id={`btn-sci-${btn.label}`}
                      key={btn.label}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={btn.action}
                      className="py-2.5 text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100/40 rounded-xl transition-all cursor-pointer flex items-center justify-center font-mono shadow-xs"
                    >
                      {btn.label}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Standard Primary Keys Grid */}
            {/* Row 1: Clear, Brackets, Division */}
            <motion.button
              id="btn-clear"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleClear}
              className="py-4 font-bold text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl transition-all cursor-pointer shadow-xs"
            >
              AC
            </motion.button>
            <motion.button
              id="btn-paren-open"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleInput('(')}
              className="py-4 font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-all cursor-pointer font-mono shadow-xs"
            >
              (
            </motion.button>
            <motion.button
              id="btn-paren-close"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleInput(')')}
              className="py-4 font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-all cursor-pointer font-mono shadow-xs"
            >
              )
            </motion.button>
            <motion.button
              id="btn-op-divide"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleInput('÷')}
              className="py-4 font-bold text-lg bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl transition-all cursor-pointer shadow-xs font-mono"
            >
              ÷
            </motion.button>

            {/* Row 2: 7, 8, 9, Multiplier */}
            {['7', '8', '9'].map((digit) => (
              <motion.button
                id={`btn-digit-${digit}`}
                key={digit}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleInput(digit)}
                className="py-4 font-bold text-lg bg-gray-50 hover:bg-gray-100 border border-gray-100 text-gray-800 rounded-2xl transition-all cursor-pointer font-mono shadow-xs"
              >
                {digit}
              </motion.button>
            ))}
            <motion.button
              id="btn-op-multiply"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleInput('×')}
              className="py-4 font-bold text-lg bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl transition-all cursor-pointer shadow-xs font-mono"
            >
              ×
            </motion.button>

            {/* Row 3: 4, 5, 6, Subtraction */}
            {['4', '5', '6'].map((digit) => (
              <motion.button
                id={`btn-digit-${digit}`}
                key={digit}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleInput(digit)}
                className="py-4 font-bold text-lg bg-gray-50 hover:bg-gray-100 border border-gray-100 text-gray-800 rounded-2xl transition-all cursor-pointer font-mono shadow-xs"
              >
                {digit}
              </motion.button>
            ))}
            <motion.button
              id="btn-op-minus"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleInput('-')}
              className="py-4 font-bold text-lg bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl transition-all cursor-pointer shadow-xs font-mono"
            >
              -
            </motion.button>

            {/* Row 4: 1, 2, 3, Addition */}
            {['1', '2', '3'].map((digit) => (
              <motion.button
                id={`btn-digit-${digit}`}
                key={digit}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleInput(digit)}
                className="py-4 font-bold text-lg bg-gray-50 hover:bg-gray-100 border border-gray-100 text-gray-800 rounded-2xl transition-all cursor-pointer font-mono shadow-xs"
              >
                {digit}
              </motion.button>
            ))}
            <motion.button
              id="btn-op-plus"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleInput('+')}
              className="py-4 font-bold text-lg bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl transition-all cursor-pointer shadow-xs font-mono"
            >
              +
            </motion.button>

            {/* Row 5: Plus/Minus, 0, Dot, Equal */}
            <motion.button
              id="btn-negate"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleInput('-')}
              className="py-4 font-semibold text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-all cursor-pointer shadow-xs"
            >
              +/-
            </motion.button>
            <motion.button
              id="btn-digit-0"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleInput('0')}
              className="py-4 font-bold text-lg bg-gray-50 hover:bg-gray-100 border border-gray-100 text-gray-800 rounded-2xl transition-all cursor-pointer font-mono shadow-xs"
            >
              0
            </motion.button>
            <motion.button
              id="btn-dot"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleInput('.')}
              className="py-4 font-bold text-lg bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-all cursor-pointer font-mono shadow-xs"
            >
              .
            </motion.button>
            <motion.button
              id="btn-calculate"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCalculate}
              className="py-4 font-bold text-xl bg-gray-900 hover:bg-black text-white rounded-2xl transition-all cursor-pointer shadow-md font-mono"
            >
              =
            </motion.button>
          </div>
        </div>

        {/* Keyboard Quick Guide Indicator */}
        <div className="text-[11px] text-gray-400 font-mono text-center select-none pt-2 flex items-center gap-1.5 justify-center">
          <span className="px-1.5 py-0.5 bg-gray-200/60 border border-gray-200 text-[10px] rounded-md font-bold shadow-2xs">ESC</span> Temizler • 
          <span className="px-1.5 py-0.5 bg-gray-200/60 border border-gray-200 text-[10px] rounded-md font-bold shadow-2xs">ENTER</span> Çözer • 
          <span className="px-1.5 py-0.5 bg-gray-200/60 border border-gray-200 text-[10px] rounded-md font-bold shadow-2xs">BACKSPACE</span> Siler
        </div>
      </div>

      {/* History Sliding Panel Component */}
      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onClearHistory={handleClearHistory}
        onSelectExpression={handleSelectHistoryItem}
      />

      {/* Footer copyright block */}
      <footer className="text-center text-xs text-gray-400 font-mono select-none mt-10">
        &copy; {new Date().getFullYear()} Hesap Makinesi • Tüm Hakları Saklıdır.
      </footer>
    </div>
  );
}
