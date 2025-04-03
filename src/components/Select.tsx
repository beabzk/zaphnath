import React, { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  id: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
}

const Select: React.FC<SelectProps> = ({
  label,
  id,
  options,
  error,
  className = '',
  disabled = false,
  ...props
}) => {
  return (
    <div className="flex flex-col">
      {label && (
        <label htmlFor={id} className="mb-1 font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`
          p-2 rounded-md border bg-white dark:bg-neutral-800
          ${error ? 'border-error focus:ring-error/25' : 'border-neutral-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-200'}
          focus:outline-none focus:ring-2
          disabled:bg-neutral-100 disabled:text-neutral-500 dark:disabled:bg-neutral-900 dark:disabled:text-neutral-400
          text-neutral-800 dark:text-neutral-100
          ${className}
        `}
        disabled={disabled}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
};

export default Select;
