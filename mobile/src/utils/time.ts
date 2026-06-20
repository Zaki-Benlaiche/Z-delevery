/** توقيت نسبي مختصر — يعتمد على دالّة الترجمة t لدعم العربية/الفرنسية */
export function timeAgo(iso: string, t: (key: string) => string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMin = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (diffMin < 1) return t("driver.timeNow");
  if (diffMin < 60) return t("driver.timeMin").replace("{n}", String(diffMin));
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return t("driver.timeHour").replace("{n}", String(hours));
  const days = Math.floor(hours / 24);
  return t("driver.timeDay").replace("{n}", String(days));
}
