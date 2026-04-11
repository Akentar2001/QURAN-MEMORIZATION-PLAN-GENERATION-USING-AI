"use client";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function Input({ label, id, className = "", ...props }: InputProps) {
  const inputId = id ?? label;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={inputId} className="text-sm font-bold text-gray-700">
        {label}
      </label>
      <input
        id={inputId}
        className="border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] focus:border-transparent"
        {...props}
      />
    </div>
  );
}
