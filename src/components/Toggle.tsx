import React from 'react';

interface ToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

const Toggle: React.FC<ToggleProps> = ({
  id,
  label,
  checked,
  onChange,
  className = '',
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="relative inline-block w-10 mr-2 align-middle select-none">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`block h-6 rounded-full ${
            checked ? 'bg-primary-600' : 'bg-neutral-400 dark:bg-neutral-600'
          } transition-colors duration-200`}
        ></div>
        <div
          className={`absolute left-1 top-1 bg-white dark:bg-neutral-200 w-4 h-4 rounded-full transition-transform duration-200 transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        ></div>
      </div>
      <label htmlFor={id} className="font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer">
        {label}
      </label>
    </div>
  );
};

export default Toggle;
