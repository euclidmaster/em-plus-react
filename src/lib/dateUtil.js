/**
 * 로컬 타임존 기준 오늘 날짜 (YYYY-MM-DD)
 * - new Date().toISOString().slice(0,10) 은 UTC 기준이라 KST 자정 ~ 09:00 사이에 전날로 나오는 버그가 있음
 */
export function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 임의의 Date 또는 ISO 문자열을 로컬 YYYY-MM-DD 로 변환
 */
export function toLocalDateString(value) {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 주어진 날짜가 속한 주의 월요일을 로컬 YYYY-MM-DD 로 반환 (일요일은 전 주 월요일)
 */
export function getMonday(date) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return toLocalDateString(d);
}
