import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ title, children, onClose, preventClose }) => (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center shrink-0">
        <h3 className="font-bold text-lg">{title}</h3>
        {onClose && !preventClose && <button onClick={onClose}><X className="w-5 h-5" /></button>}
      </div>
      <div className="p-4 overflow-y-auto grow">
        {children}
      </div>
    </div>
  </div>
);

export default Modal;