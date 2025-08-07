import React from 'react';
import { cn } from '@/lib/utils';
import LoadingSpinner from './LoadingSpinner';

interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyText?: string;
  className?: string;
  onRowClick?: (record: T, index: number) => void;
  onRowDoubleClick?: (record: T, index: number) => void;
  keyExtractor?: (record: T, index: number) => string;
  getRowClassName?: (record: T, index: number) => string;
}

function Table<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyText = 'Aucune donnée',
  className,
  onRowClick,
  onRowDoubleClick,
  keyExtractor,
  getRowClassName,
}: TableProps<T>) {
  const getValue = (record: T, key: string): any => {
    return key.split('.').reduce((obj, k) => obj?.[k], record);
  };

  return (
    <div className={cn('card overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="table">
          <thead className="table-header">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={cn('table-header-cell', column.className)}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="table-body">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center"
                >
                  <LoadingSpinner className="mx-auto" />
                  <p className="mt-2 text-sm text-gray-500">Chargement...</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((record, rowIndex) => (
                <tr
                  key={keyExtractor ? keyExtractor(record, rowIndex) : rowIndex}
                  className={cn(
                    'hover:bg-gray-50 transition-colors',
                    (onRowClick || onRowDoubleClick) && 'cursor-pointer',
                    getRowClassName?.(record, rowIndex)
                  )}
                  onClick={() => onRowClick?.(record, rowIndex)}
                  onDoubleClick={() => onRowDoubleClick?.(record, rowIndex)}
                >
                  {columns.map((column, colIndex) => {
                    const value = getValue(record, column.key as string);
                    const content = column.render
                      ? column.render(value, record, rowIndex)
                      : value;

                    return (
                      <td
                        key={colIndex}
                        className={cn('table-cell', column.className)}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Table;