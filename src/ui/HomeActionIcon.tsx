import Svg, { Circle, Path } from "react-native-svg";

export type HomeActionIconName = "contract" | "messages" | "account" | "properties" | "payment" | "reports";

type Props = { name: HomeActionIconName; size?: number; color?: string };

const stroke = { fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 1.9 };

export function HomeActionIcon({ name, size = 31, color = "#2E2E2E" }: Props) {
  const common = { ...stroke, stroke: color };
  return <Svg accessibilityElementsHidden height={size} viewBox="0 0 32 32" width={size}>
    {name === "contract" ? <><Path {...common} d="M7 3h18v20H7zM11 8h10M11 13h10M11 18h5" /><Path {...common} d="m19 21 2 2 4-5" /></> : null}
    {name === "messages" ? <><Path {...common} d="M4 6h24v17H12l-6 5v-5H4z" /><Circle cx="11" cy="14" fill={color} r="1.25" /><Circle cx="16" cy="14" fill={color} r="1.25" /><Circle cx="21" cy="14" fill={color} r="1.25" /></> : null}
    {name === "account" ? <><Circle {...common} cx="16" cy="10" r="6" /><Path {...common} d="M5 29c1-6 5.4-10 11-10s10 4 11 10" /></> : null}
    {name === "properties" ? <><Path {...common} d="m3 13 13-9 13 9M6 13v14M12 13v14M20 13v14M26 13v14M3 28h26" /><Path {...common} d="M5 10h22" /></> : null}
    {name === "payment" ? <><Circle {...common} cx="16" cy="16" r="13" /><Path {...common} d="M20 11c-.8-.8-2.1-1.3-3.8-1.3-2.5 0-4.2 1.2-4.2 3.1 0 4.1 8 1.6 8 5.7 0 2-1.7 3.3-4.4 3.3-1.8 0-3.4-.6-4.4-1.6M16 7v18" /></> : null}
    {name === "reports" ? <><Path {...common} d="M6 25V14c0-5.5 4.5-10 10-10s10 4.5 10 10v11M3 25h26M9 29h14" /><Path {...common} d="M16 10v6M16 20h.01" /></> : null}
  </Svg>;
}
