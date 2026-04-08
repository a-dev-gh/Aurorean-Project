import { useState } from 'react';

/**
 * Simple diff viewer for code suggestions.
 * Shows old code vs new code side by side with Apply/Save buttons.
 */
const DiffViewer = ({ oldCode, newCode, fileName, onApply, onSave, onClose }) => {
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    if (onApply) onApply(newCode, fileName);
    setApplied(true);
  };

  const handleSave = () => {
    if (onSave) onSave(newCode, fileName);
  };

  // Simple line-by-line diff highlighting
  const oldLines = (oldCode || '').split('\n');
  const newLines = (newCode || '').split('\n');
  const maxLines = Math.max(oldLines.length, newLines.length);

  return (
    <div className="diff-viewer">
      <div className="diff-header">
        <div className="diff-title">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
            <path d="M14 2v6h6" />
          </svg>
          <span>{fileName || 'Suggestion'}</span>
        </div>
        <div className="diff-actions">
          <button className="btn btn-ghost" onClick={handleSave}>
            Save to suggestions
          </button>
          <button
            className="btn btn-primary"
            onClick={handleApply}
            disabled={applied}
          >
            {applied ? 'Applied' : 'Apply changes'}
          </button>
          {onClose && (
            <button className="btn-icon" onClick={onClose}>&times;</button>
          )}
        </div>
      </div>

      <div className="diff-panels">
        {/* Old code panel */}
        <div className="diff-panel">
          <div className="diff-panel-header">
            <span className="diff-label diff-label-old">Original</span>
          </div>
          <pre className="diff-code">
            {oldLines.map((line, i) => {
              const changed = i < newLines.length && line !== newLines[i];
              const removed = i >= newLines.length;
              return (
                <div
                  key={i}
                  className={`diff-line ${changed ? 'diff-removed' : ''} ${removed ? 'diff-removed' : ''}`}
                >
                  <span className="diff-line-num">{i + 1}</span>
                  <span className="diff-line-content">{line || ' '}</span>
                </div>
              );
            })}
          </pre>
        </div>

        {/* New code panel */}
        <div className="diff-panel">
          <div className="diff-panel-header">
            <span className="diff-label diff-label-new">Suggestion</span>
          </div>
          <pre className="diff-code">
            {newLines.map((line, i) => {
              const changed = i < oldLines.length && line !== oldLines[i];
              const added = i >= oldLines.length;
              return (
                <div
                  key={i}
                  className={`diff-line ${changed ? 'diff-added' : ''} ${added ? 'diff-added' : ''}`}
                >
                  <span className="diff-line-num">{i + 1}</span>
                  <span className="diff-line-content">{line || ' '}</span>
                </div>
              );
            })}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default DiffViewer;
