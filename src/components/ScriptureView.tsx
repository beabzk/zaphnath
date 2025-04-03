import React from 'react';

interface Verse {
  verse: string;
  text: string;
}

interface ScriptureViewProps {
  verses: Verse[];
  isLoading: boolean;
  error: string | null;
  className?: string;
}

const ScriptureView: React.FC<ScriptureViewProps> = ({
  verses,
  isLoading,
  error,
  className = '',
}) => {
  if (isLoading) {
    return (
      <div className={`flex justify-center items-center p-8 ${className}`}>
        <div className="animate-pulse flex flex-col space-y-4 w-full">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4"></div>
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full"></div>
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-5/6"></div>
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full"></div>
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 text-center ${className}`}>
        <p className="text-error">Error: {error}</p>
      </div>
    );
  }

  if (verses.length === 0) {
    return (
      <div className={`p-4 text-center ${className}`}>
        <p className="text-neutral-500 dark:text-neutral-400">No verses found for this selection.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 leading-relaxed font-scripture ${className}`}>
      {verses.map((verse, index) => (
        <p key={index} className="verse-container">
          <span className="font-semibold text-sm align-top mr-2 text-neutral-600 dark:text-neutral-400">
            {verse.verse}
          </span>
          <span className="text-neutral-900 dark:text-neutral-50">{verse.text}</span>
        </p>
      ))}
    </div>
  );
};

export default ScriptureView;
