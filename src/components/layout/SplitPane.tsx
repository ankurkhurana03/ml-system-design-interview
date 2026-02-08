import { useState, useRef, useCallback, useEffect } from 'react';

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultSplit?: number; // percentage, default 50
  minLeft?: number;      // min percentage, default 25
  minRight?: number;     // min percentage, default 25
  isMobile?: boolean;
}

type ViewMode = 'graph' | 'split' | 'wizard';

// Simple SVG Icons
const LayoutIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
    <line x1="12" y1="3" x2="12" y2="21" strokeWidth={2} />
  </svg>
);

const NetworkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3" strokeWidth={2} />
    <circle cx="6" cy="6" r="2" strokeWidth={2} />
    <circle cx="18" cy="6" r="2" strokeWidth={2} />
    <circle cx="6" cy="18" r="2" strokeWidth={2} />
    <circle cx="18" cy="18" r="2" strokeWidth={2} />
    <line x1="8" y1="6" x2="10" y2="10" strokeWidth={2} />
    <line x1="16" y1="6" x2="14" y2="10" strokeWidth={2} />
    <line x1="8" y1="18" x2="10" y2="14" strokeWidth={2} />
    <line x1="16" y1="18" x2="14" y2="14" strokeWidth={2} />
  </svg>
);

const ListIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <line x1="8" y1="6" x2="21" y2="6" strokeWidth={2} strokeLinecap="round" />
    <line x1="8" y1="12" x2="21" y2="12" strokeWidth={2} strokeLinecap="round" />
    <line x1="8" y1="18" x2="21" y2="18" strokeWidth={2} strokeLinecap="round" />
    <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth={2} strokeLinecap="round" />
    <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth={2} strokeLinecap="round" />
    <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth={2} strokeLinecap="round" />
  </svg>
);

export function SplitPane({
  left,
  right,
  defaultSplit = 50,
  minLeft = 25,
  minRight = 25,
  isMobile,
}: SplitPaneProps) {
  const [splitPercent, setSplitPercent] = useState(defaultSplit);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? 'wizard' : 'split');
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartPercent = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartPercent.current = splitPercent;
  }, [splitPercent]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const deltaX = e.clientX - dragStartX.current;
    const deltaPercent = (deltaX / containerWidth) * 100;

    let newPercent = dragStartPercent.current + deltaPercent;

    // Enforce min/max constraints
    newPercent = Math.max(minLeft, Math.min(100 - minRight, newPercent));

    setSplitPercent(newPercent);
  }, [isDragging, minLeft, minRight]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const showLeft = viewMode === 'graph' || viewMode === 'split';
  const showRight = viewMode === 'wizard' || viewMode === 'split';
  const showDivider = viewMode === 'split';

  const leftWidth = viewMode === 'split' ? splitPercent : 100;
  const rightWidth = viewMode === 'split' ? 100 - splitPercent : 100;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Toolbar */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-center gap-1 px-4">
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('graph')}
            className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'graph'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="Graph Only"
          >
            <NetworkIcon />
            <span className="hidden sm:inline">Graph Only</span>
          </button>
          {!isMobile && (
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'split'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Split View"
            >
              <LayoutIcon />
              <span className="hidden sm:inline">Split</span>
            </button>
          )}
          <button
            onClick={() => setViewMode('wizard')}
            className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'wizard'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="Wizard Only"
          >
            <ListIcon />
            <span className="hidden sm:inline">Wizard Only</span>
          </button>
        </div>
      </div>

      {/* Split Pane Container */}
      <div ref={containerRef} className="flex-1 flex relative overflow-hidden">
        {/* Left Panel */}
        {showLeft && (
          <div
            className="h-full overflow-auto"
            style={{
              width: `${leftWidth}%`,
              display: showLeft ? 'block' : 'none',
            }}
          >
            {left}
          </div>
        )}

        {/* Divider */}
        {showDivider && (
          <div
            className={`relative w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors flex-shrink-0 ${
              isDragging ? 'bg-blue-500' : ''
            }`}
            onMouseDown={handleMouseDown}
          >
            {/* Drag Handle */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 flex items-center justify-center">
              <div className="w-1 h-12 bg-gray-400 rounded-full opacity-0 hover:opacity-100 transition-opacity" />
            </div>
          </div>
        )}

        {/* Right Panel */}
        {showRight && (
          <div
            className="h-full overflow-auto"
            style={{
              width: `${rightWidth}%`,
              display: showRight ? 'block' : 'none',
            }}
          >
            {right}
          </div>
        )}
      </div>
    </div>
  );
}
