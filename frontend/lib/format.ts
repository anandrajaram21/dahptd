const formatter = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
export const number = (value: number | null) =>
  value === null ? "—" : formatter.format(value);
export const signed = (value: number) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatter.format(Math.abs(value))}`;

export const dayLabel = (value: string, weekday = true) =>
  new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    ...(weekday && { weekday: "long" }),
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
export const shortDayLabel = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
export const timeLabel = (value: string | number) =>
  new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
export const publicationLabel = (value: string) =>
  `${shortDayLabel(value)}, ${timeLabel(value)}`;

const MINUTE = 60_000;
export const intervalLabel = (start: string, minutes: number) =>
  `${timeLabel(start)}–${timeLabel(new Date(start).getTime() + minutes * MINUTE)}`;

/** "13:00" → "1:00 pm"; values stay 24-hour, only the label changes. */
export function twelveHour(time: string) {
  const [h, m] = time.split(":").map(Number);
  return {
    clock: `${h % 12 || 12}:${String(m).padStart(2, "0")}`,
    half: h < 12 ? "am" : "pm",
  };
}
