import React from 'react';
import { TaskPriority } from '../../types';

interface PriorityBadgeProps {
  priority: TaskPriority;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  switch (priority) {
    case 'URGENT':
      return <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />Khẩn cấp</span>;
    case 'HIGH':
      return <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Cao</span>;
    case 'MEDIUM':
      return <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />Trung bình</span>;
    case 'LOW':
    default:
      return <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600"><span className="h-1.5 w-1.5 rounded-full bg-slate-400" />Thấp</span>;
  }
};
