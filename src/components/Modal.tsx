import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClass = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export const Modal: React.FC<ModalProps> = ({ title, onClose, children, size = 'md' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
    <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeClass[size]} max-h-[90vh] flex flex-col`}>
      <div className="flex items-center justify-between p-6 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="overflow-y-auto flex-1 p-6">{children}</div>
    </div>
  </div>
);
