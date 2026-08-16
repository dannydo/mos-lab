'use client';

import React from 'react';
import { Empty, Spin } from 'antd';

export interface MobileRecordListProps<RecordType> {
  records: readonly RecordType[];
  getKey: (record: RecordType, index: number) => React.Key;
  renderRecord: (record: RecordType, index: number) => React.ReactNode;
  loading?: boolean;
  emptyDescription?: React.ReactNode;
  className?: string;
  recordClassName?: string;
  getRecordClassName?: (record: RecordType, index: number) => string;
}

/**
 * Presentation-only mobile data surface. The owning feature keeps the query,
 * pagination and business mapping; this component only gives records a touch
 * friendly layout.
 */
export function MobileRecordList<RecordType>({
  records,
  getKey,
  renderRecord,
  loading = false,
  emptyDescription = 'Chưa có dữ liệu',
  className = '',
  recordClassName = '',
  getRecordClassName,
}: MobileRecordListProps<RecordType>) {
  if (loading) {
    return (
      <div className="responsive-mobile-record-list flex items-center justify-center py-8" aria-busy="true">
        <Spin />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="responsive-mobile-record-list py-8">
        <Empty description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className={`responsive-mobile-record-list ${className}`}>
      {records.map((record, index) => (
        <article
          className={`responsive-mobile-record-card ${recordClassName} ${getRecordClassName?.(record, index) || ''}`}
          key={getKey(record, index)}
        >
          {renderRecord(record, index)}
        </article>
      ))}
    </div>
  );
}

export default MobileRecordList;
