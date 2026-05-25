/** فرض الاتجاه من اليمين إلى اليسار وضبط لغة الواجهة */
import { I18nManager } from "react-native";

export function enableRTL() {
  // يكفي ضبطها مرّة واحدة عند الإقلاع؛ تتطلّب إعادة تشغيل في dev mode عند أوّل مرّة
  if (!I18nManager.isRTL) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  }
}
