import {
  Boxes,
  Gem,
  Headphones,
  PhoneCall,
  Scissors,
  ShieldCheck,
  UserRoundPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Team, TeamStaffOption } from '@mos-lab/shared';
import { type StatusType } from '~/components/ui';
import styles from './teams.module.css';

export type RoleFilter = 'ALL' | 'CC' | 'CV' | 'BK' | 'OTHER';

export type TeamFormValues = {
  code: string;
  name: string;
  description?: string;
  departmentId?: number;
  parentTeamId?: number;
  sortOrder?: number;
  isActive?: boolean;
};

export const ROLE_FILTERS: ReadonlyArray<{ label: string; value: RoleFilter }> = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'CC', value: 'CC' },
  { label: 'KTV/CV', value: 'CV' },
  { label: 'Booker', value: 'BK' },
  { label: 'Khác', value: 'OTHER' },
];

export function teamStatus(code: string): StatusType {
  if (code === 'CC') return 'processing';
  if (code === 'CV') return 'success';
  if (code === 'BK') return 'warning';
  if (code.includes('TELESALES')) return 'orange';
  if (code.includes('CS')) return 'cyan';
  if (code.includes('CONTROL')) return 'purple';
  return 'default';
}

export function teamIcon(code: string): LucideIcon {
  if (code === 'CC') return Gem;
  if (code === 'CV') return Scissors;
  if (code === 'BK') return PhoneCall;
  if (code.includes('TELESALES')) return Headphones;
  if (code.includes('CS')) return UserRoundPlus;
  if (code.includes('CONTROL')) return ShieldCheck;
  if (code.includes('OTHER')) return Boxes;
  return Users;
}

function staffInitial(staff: TeamStaffOption) {
  return staff.displayName.trim().charAt(0).toUpperCase() || '?';
}

export function flattenTeams(teamList: Team[]): Team[] {
  return teamList.flatMap((team) => [team, ...flattenTeams(team.children || [])]);
}

export function teamDescendantIds(team: Team): Set<number> {
  return new Set(flattenTeams(team.children || []).map((child) => child.id));
}

export function updateTeamInTree(teamList: Team[], code: string, update: (team: Team) => Team): Team[] {
  return teamList.map((team) => ({
    ...((team.code === code ? update(team) : team) as Team),
    children: team.children ? updateTeamInTree(team.children, code, update) : team.children,
  }));
}

export function StaffIdentity({ staff, active = false }: { staff: TeamStaffOption; active?: boolean }) {
  return (
    <div className={styles.staffIdentity}>
      <span className={`${styles.staffAvatar} ${active ? styles.staffAvatarActive : ''}`} aria-hidden>
        {staffInitial(staff)}
      </span>
      <span className={styles.staffText}>
        <strong>{staff.displayName}</strong>
        <span className={styles.staffMeta}>
          <span className="tabular-nums">#{staff.staffId}</span>
          {staff.username && <span>@{staff.username}</span>}
          {staff.role && <span>{staff.role}</span>}
        </span>
      </span>
    </div>
  );
}
