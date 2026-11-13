import { Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/core/theme/theme';

const paths = {
  home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-8H9v8H4a1 1 0 0 1-1-1Z',
  horse: 'M7 21v-5l-3-3 2-7 5-3 2 4 5 3 2 4-2 2-5-2-3 3v4M7 6l3 2M14 10h.01',
  tasks: 'M9 5h11M9 12h11M9 19h11M3 5l1 1 2-2M3 12l1 1 2-2M3 19l1 1 2-2',
  grid: 'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',
  user: 'M20 21v-2a7 7 0 0 0-14 0v2M13 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  search: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm6 14 4 4',
  chevron: 'm9 5 7 7-7 7',
  down: 'm5 9 7 7 7-7',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  eyeOff:
    'm3 3 18 18M10 5a11 11 0 0 1 2 0c6 0 10 7 10 7a20 20 0 0 1-3 4M6 6a20 20 0 0 0-4 6s4 7 10 7a12 12 0 0 0 6-2m-8-7 4 4',
  lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5Zm7 5v2',
  mail: 'M3 5h18v14H3Zm0 0 9 8 9-8',
  plus: 'M12 5v14M5 12h14',
  activity: 'M2 12h4l3-8 6 16 3-8h4',
  shield: 'm12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Zm-5 10 3 3 6-6',
  stable: 'm2 8 10-5 10 5M4 8v13h16V8M9 21v-8h6v8',
  clipboard: 'M9 4H5v18h14V4h-4M9 2h6v5H9Zm-1 10h8m-8 5h5',
  warehouse: 'm3 8 9-5 9 5v13H3Zm4 13V11h10v10M7 15h10M7 18h10',
  medical: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z',
  chart: 'M3 3v18h18M7 16v-5m5 5V7m5 9V4',
  logout: 'M9 3H3v18h6m6-14 5 5-5 5m-6-5h11',
  calendar: 'M4 5h16v16H4Zm0 5h16M8 2v6m8-6v6M8 14h2m4 0h2m-8 4h2',
  check: 'm5 12 4 4L19 6',
  warning: 'm12 3 10 18H2Zm0 5v5m0 4h.01',
  close: 'm6 6 12 12M6 18 18 6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  file: 'M14 2H4v20h16V8Zm0 0v6h6M8 13h8m-8 4h5',
  users:
    'M16 21v-2a6 6 0 0 0-12 0v2M10 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm7 0a4 4 0 0 1 0 8m3 10v-2a6 6 0 0 0-3-5',
  leaf: 'M20 3c-10-2-18 4-15 12s16 8 15-12ZM4 21 16 9',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 4h.01',
  filter: 'M3 5h18M6 12h12M9 19h6',
  phone: 'M5 3h4l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v4c0 4-9 1-14-4S1 3 5 3Z',
} as const;
export type IconName = keyof typeof paths;
export function Icon({
  name,
  size = 22,
  color = colors.ink,
  strokeWidth = 1.7,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      {...(Platform.OS === 'web' ? { 'aria-hidden': true } : { accessible: false })}
    >
      <Path
        d={paths[name]}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
export const moduleIcons: Record<string, IconName> = {
  horses: 'horse',
  admissions: 'clipboard',
  stables: 'stable',
  stalls: 'stable',
  occupancies: 'stable',
  assignments: 'users',
  trainerAssignments: 'users',
  areaAssignments: 'stable',
  grooms: 'users',
  training: 'target',
  sessions: 'chart',
  tasks: 'tasks',
  alerts: 'warning',
  rations: 'leaf',
  medical: 'medical',
  injuries: 'activity',
  schedules: 'calendar',
  prescriptions: 'medical',
  incidents: 'warning',
  warehouses: 'warehouse',
  items: 'grid',
  receipts: 'clipboard',
  transfers: 'arrow',
  ledger: 'file',
  feedIssues: 'leaf',
  replenishments: 'plus',
  stocktakes: 'clipboard',
  disposals: 'shield',
  team: 'users',
  staffWork: 'tasks',
  audit: 'file',
};
