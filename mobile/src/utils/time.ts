/** توقيت نسبي مختصر بالعربية: "الآن" / "منذ Xد" / "منذ Xس" / "منذ Xي" */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMin = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (diffMin < 1) return "الآن";
  if (diffMin < 60) return `منذ ${diffMin}د`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `منذ ${hours}س`;
  const days = Math.floor(hours / 24);
  return `منذ ${days}ي`;
}
