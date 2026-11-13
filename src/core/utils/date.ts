export const clubDate = (date = new Date()) =>
  new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10);
export const shiftDay = (day: string, amount: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + amount * 86400000).toISOString().slice(0, 10);
export const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(value))
    : '—';
export const formatTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '—';
