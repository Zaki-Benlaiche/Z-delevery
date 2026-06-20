/** أدوات رقم الهاتف الجزائري — توحيد الصيغة إلى E.164 (+213XXXXXXXXX) */

export const DZ_DIAL = "+213";

/** الجزء الوطني (بلا 0 ولا 213) — 9 خانات للجزائر */
export function dzNational(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("213")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.slice(1);
  return d;
}

/** الصيغة المعيارية للإرسال للخادم: +213 متبوعاً بالجزء الوطني */
export function normalizeDzPhone(input: string): string {
  return DZ_DIAL + dzNational(input);
}

/** هل الرقم الوطني صالح (9 خانات)؟ */
export function isValidDzPhone(input: string): boolean {
  return dzNational(input).length === 9;
}
