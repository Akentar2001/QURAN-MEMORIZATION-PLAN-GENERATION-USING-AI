interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

export default function Card({ children, className = "", onClose }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-md p-6 relative ${className}`}>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 left-3 text-gray-400 hover:text-red-500 text-xl cursor-pointer"
          aria-label="إغلاق"
        >
          &times;
        </button>
      )}
      {children}
    </div>
  );
}
