import { motion, AnimatePresence } from 'motion/react';
import { Trash2, X, Clock, CornerDownLeft } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onClearHistory: () => void;
  onSelectExpression: (expr: string) => void;
}

export default function HistoryPanel({
  isOpen,
  onClose,
  history,
  onClearHistory,
  onSelectExpression,
}: HistoryPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            id="history-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 cursor-pointer"
          />

          {/* Drawer */}
          <motion.div
            id="history-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-[#111827] border-l border-gray-800 text-white z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-lg text-gray-100">Hesaplama Geçmişi</h3>
              </div>
              <div className="flex items-center gap-1">
                {history.length > 0 && (
                  <button
                    id="btn-clear-history"
                    onClick={onClearHistory}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800/50 rounded-lg transition-colors cursor-pointer"
                    title="Geçmişi Temizle"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  id="btn-close-history"
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-800">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-2 py-12">
                  <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-gray-600" />
                  </div>
                  <p className="text-sm">Henüz bir hesaplama yapılmadı.</p>
                  <p className="text-xs text-gray-600">Yaptığınız işlemler burada görünecektir.</p>
                </div>
              ) : (
                history.map((item) => (
                  <motion.div
                    id={`history-item-${item.id}`}
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group bg-gray-900/40 hover:bg-gray-900/90 border border-gray-800/60 hover:border-gray-800 p-3 rounded-xl transition-all flex flex-col justify-between gap-1.5"
                  >
                    <div className="text-xs text-gray-500 font-mono self-end">
                      {new Date(item.timestamp).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                    
                    <div className="text-right font-mono text-gray-400 text-sm overflow-x-auto whitespace-nowrap scrollbar-none">
                      {item.expression}
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <button
                        id={`btn-use-history-${item.id}`}
                        onClick={() => onSelectExpression(item.expression)}
                        className="flex items-center gap-1 text-[11px] text-emerald-400/80 hover:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        <CornerDownLeft className="w-3 h-3" />
                        Kullan
                      </button>
                      <button
                        id={`btn-use-result-${item.id}`}
                        onClick={() => onSelectExpression(item.result)}
                        className="font-mono text-right text-base text-white font-medium select-all hover:text-emerald-300 transition-colors cursor-pointer"
                      >
                        = {item.result}
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
