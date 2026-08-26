const BRANCH_BADGE_STYLES = {
  DT: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  EP: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  PXL: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  fallback: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
} as const;

export function getCvBranchBadgeStyle(branchCode?: string, branchName?: string): string {
  const branch = `${branchCode || ''} ${branchName || ''}`.toLocaleUpperCase('vi-VN');

  if (branch.includes('EP') || branch.includes('ESTELLA')) return BRANCH_BADGE_STYLES.EP;
  if (branch.includes('PXL') || branch.includes('PHAN XÍCH LONG') || branch.includes('PHAN XICH LONG')) {
    return BRANCH_BADGE_STYLES.PXL;
  }
  if (branch.includes('DT') || branch.includes('ĐỀ THÁM') || branch.includes('DE THAM')) {
    return BRANCH_BADGE_STYLES.DT;
  }

  return BRANCH_BADGE_STYLES.fallback;
}
