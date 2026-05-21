export const SCHEDULED_AT_TIME_STEP_MINUTES = 10;
export const SCHEDULED_AT_VALIDATION_MESSAGE =
  "시작 시간은 다음 선택 가능한 10분 슬롯 이후로 설정해주세요.";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function parseScheduledAtValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) {
    return null;
  }

  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  if ([year, month, day, hours, minutes].some((part) => Number.isNaN(part))) {
    return null;
  }

  const parsed = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hours ||
    parsed.getMinutes() !== minutes
  ) {
    return null;
  }

  return parsed;
}

export function formatScheduledAtValue(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate()
  )}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function getNextSelectableScheduledAt(base = new Date()): Date {
  const next = new Date(base);
  const minutes = next.getMinutes();
  const remainder = minutes % SCHEDULED_AT_TIME_STEP_MINUTES;
  const increment =
    remainder === 0
      ? SCHEDULED_AT_TIME_STEP_MINUTES
      : SCHEDULED_AT_TIME_STEP_MINUTES - remainder;

  next.setSeconds(0, 0);
  next.setMinutes(minutes + increment);

  return next;
}

export function isScheduledAtSelectable(value: string, base = new Date()): boolean {
  const parsed = parseScheduledAtValue(value);
  if (!parsed) {
    return false;
  }

  return parsed.getTime() >= getNextSelectableScheduledAt(base).getTime();
}

export function sanitizeScheduledAtDraft(value: string, base = new Date()): string {
  return isScheduledAtSelectable(value, base) ? value : "";
}
