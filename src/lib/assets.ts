/** Đường dẫn tới file trong thư mục public/, có tính base path (VD /MY-TREK/) */
export function asset(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}

/** Hình minh họa trong public/illustrations/ */
export const ILLUSTRATIONS = {
  emptyTrips: 'illustrations/empty-trips.png',
  emptyExpenses: 'illustrations/empty-expenses.png',
  emptyChecklist: 'illustrations/empty-checklist.png',
  emptyFiles: 'illustrations/empty-files.png',
  emailSent: 'illustrations/email-sent.png',
  notFound: 'illustrations/not-found.png',
  authHero: 'illustrations/auth-hero.png',
} as const
