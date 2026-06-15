/** مكوّن أيقونات موحّد — يغلّف @expo/vector-icons بأسماء دلالية */
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { colors } from "../theme/colors";

type Family = "ion" | "mci";

export type IconName =
  | "search"
  | "location"
  | "locationFill"
  | "bell"
  | "scooter"
  | "star"
  | "heart"
  | "heartOutline"
  | "back"
  | "chevronDown"
  | "chevronLeft"
  | "clock"
  | "phone"
  | "person"
  | "personFill"
  | "card"
  | "cash"
  | "check"
  | "plus"
  | "minus"
  | "close"
  | "home"
  | "homeFill"
  | "receipt"
  | "receiptFill"
  | "heartFill"
  | "bag"
  | "restaurant"
  | "shirt"
  | "sparkles"
  | "store"
  | "shield"
  | "lock"
  | "globe"
  | "leaf"
  | "basket"
  | "info"
  | "logout"
  | "feedback"
  | "trash"
  | "tag"
  | "edit";

const MAP: Record<IconName, { family: Family; glyph: string }> = {
  search: { family: "ion", glyph: "search" },
  location: { family: "ion", glyph: "location-outline" },
  locationFill: { family: "ion", glyph: "location" },
  bell: { family: "ion", glyph: "notifications-outline" },
  scooter: { family: "mci", glyph: "moped" },
  star: { family: "ion", glyph: "star" },
  heart: { family: "ion", glyph: "heart" },
  heartFill: { family: "ion", glyph: "heart" },
  heartOutline: { family: "ion", glyph: "heart-outline" },
  back: { family: "ion", glyph: "arrow-forward" },
  chevronDown: { family: "ion", glyph: "chevron-down" },
  chevronLeft: { family: "ion", glyph: "chevron-back" },
  clock: { family: "ion", glyph: "time-outline" },
  phone: { family: "ion", glyph: "call-outline" },
  person: { family: "ion", glyph: "person-outline" },
  personFill: { family: "ion", glyph: "person" },
  card: { family: "ion", glyph: "card-outline" },
  cash: { family: "mci", glyph: "cash" },
  check: { family: "ion", glyph: "checkmark" },
  plus: { family: "ion", glyph: "add" },
  minus: { family: "ion", glyph: "remove" },
  close: { family: "ion", glyph: "close" },
  home: { family: "ion", glyph: "home-outline" },
  homeFill: { family: "ion", glyph: "home" },
  receipt: { family: "ion", glyph: "receipt-outline" },
  receiptFill: { family: "ion", glyph: "receipt" },
  bag: { family: "ion", glyph: "bag-handle-outline" },
  restaurant: { family: "mci", glyph: "silverware-fork-knife" },
  shirt: { family: "ion", glyph: "shirt-outline" },
  sparkles: { family: "ion", glyph: "sparkles" },
  store: { family: "ion", glyph: "storefront-outline" },
  shield: { family: "ion", glyph: "shield-checkmark-outline" },
  lock: { family: "ion", glyph: "lock-closed-outline" },
  globe: { family: "ion", glyph: "globe-outline" },
  leaf: { family: "ion", glyph: "leaf-outline" },
  basket: { family: "ion", glyph: "basket-outline" },
  info: { family: "ion", glyph: "information-circle-outline" },
  logout: { family: "ion", glyph: "log-out-outline" },
  feedback: { family: "ion", glyph: "chatbubble-ellipses-outline" },
  trash: { family: "ion", glyph: "trash-outline" },
  tag: { family: "ion", glyph: "pricetag-outline" },
  edit: { family: "ion", glyph: "create-outline" },
};

interface Props {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 20, color = colors.text }: Props) {
  const def = MAP[name];
  if (def.family === "mci") {
    return <MaterialCommunityIcons name={def.glyph as never} size={size} color={color} />;
  }
  return <Ionicons name={def.glyph as never} size={size} color={color} />;
}
