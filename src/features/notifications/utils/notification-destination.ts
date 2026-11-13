import type { Href } from 'expo-router';
export function notificationDestination(value: string): Href | null {
  let path: URL;
  try {
    path = new URL(value, 'https://mobile.invalid');
  } catch {
    return null;
  }
  const batch = path.searchParams.get('batchNotification');
  if (batch) return { pathname: '/notification-tasks/[id]', params: { id: batch } };
  for (const [key, module] of [
    ['application', 'admissions'],
    ['schedule', 'schedules'],
    ['record', 'prescriptions'],
    ['report', 'incidents'],
    ['session', 'sessions'],
  ] as const) {
    const id = path.searchParams.get(key);
    if (id) return { pathname: '/records/[module]/[id]', params: { module, id } };
  }
  const task = path.searchParams.get('task');
  if (task) return { pathname: '/tasks/[id]', params: { id: task } };
  const review = path.searchParams.get('review');
  if (review) return { pathname: '/session-review/[id]', params: { id: review } };
  const module = (
    {
      replenishments: 'replenishments',
      stocktakes: 'stocktakes',
      'stock-disposals': 'disposals',
      'medical-care': 'schedules',
      training: 'sessions',
    } as Record<string, string>
  )[path.pathname.replace(/\/$/, '').split('/').at(-1) ?? ''];
  if (module) return { pathname: '/workspace/[module]', params: { module } };
  if (path.pathname.replace(/\/$/, '') === '/dashboard/daily-tasks') return '/(tabs)/tasks';
  return null;
}
