

import React from 'react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  const bgColor = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-accent';
  const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-fade-in bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm glass rounded-ios-lg p-8 shadow-2xl animate-slide-up text-center">
        <div className={`w-20 h-20 ${bgColor} text-white rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg`}>
          <i className={`fas ${icon}`}></i>
        </div>
        <h3 className="text-xl font-black mb-2 uppercase tracking-tight">
          {type === 'error' ? 'Oops!' : type === 'success' ? 'Success' : 'Notice'}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          {message}
        </p>
        <button 
          onClick={onClose}
          className="w-full h-14 bg-slate-900 dark:bg-white text-white dark:text-black rounded-ios-lg font-bold shadow-xl hover:scale-105 active:scale-95 transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default Notification;
