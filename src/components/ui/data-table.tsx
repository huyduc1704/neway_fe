'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  title: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, record: T, index: number) => React.ReactNode;
  dataIndex?: keyof T;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey?: keyof T | ((record: T) => string);
  loading?: boolean;
  pageSize?: number;
  emptyText?: string;
  className?: string;
  summary?: React.ReactNode;
  onRowClick?: (record: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns, data, rowKey = 'id', loading, pageSize = 20,
  emptyText = 'Không có dữ liệu', className, summary, onRowClick,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const paginated = data.slice((page - 1) * pageSize, page * pageSize);

  const getKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') return rowKey(record);
    return String(record[rowKey] ?? index);
  };

  const getValue = (record: T, col: Column<T>, index: number): React.ReactNode => {
    if (col.render) {
      const val = col.dataIndex ? record[col.dataIndex] : record[col.key as keyof T];
      return col.render(val, record, index);
    }
    if (col.dataIndex) return record[col.dataIndex] as React.ReactNode;
    return record[col.key as keyof T] as React.ReactNode;
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative rounded-lg border border-gray-200 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
            <div className="h-6 w-6 rounded-full border-2 border-[#E8890C] border-t-transparent animate-spin" />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  style={{ width: col.width }}
                  className={cn(col.align === 'center' && 'text-center', col.align === 'right' && 'text-right')}
                >
                  {col.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-10 text-gray-400">
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((record, i) => (
                <TableRow
                  key={getKey(record, i)}
                  onClick={() => onRowClick?.(record)}
                  className={cn(onRowClick && 'cursor-pointer')}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(col.align === 'center' && 'text-center', col.align === 'right' && 'text-right')}
                    >
                      {getValue(record, col, (page - 1) * pageSize + i)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
            {summary && (
              <TableRow className="bg-orange-50 font-semibold">
                {summary}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data.length > pageSize && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.length)} / {data.length} bản ghi</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 py-1 text-sm font-medium">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
