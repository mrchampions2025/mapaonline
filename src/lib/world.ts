export const AVATARS = [
  { name: "Explorador", color: "#ffc466" },
  { name: "Navegante", color: "#70e0c1" },
  { name: "Constructor", color: "#ff886d" },
  { name: "Guardabosques", color: "#b0afff" },
];
export const DISTRICT_NAMES = [
  "Barrio Fundador",
  "La Arboleda",
  "Las Terrazas",
  "Horizonte",
];
export function elevation(x: number, y: number) {
  return (
    12 +
    65 * Math.exp(-((x - 14) ** 2 + (y - 14) ** 2) / 24) +
    90 * Math.exp(-((x - 27) ** 2 + (y - 15) ** 2) / 22) +
    4 * Math.sin(x * 0.35) * Math.cos(y * 0.42)
  );
}
export function project(x: number, y: number) {
  return {
    x: 800 + (x - y) * 17,
    y: 1060 + (x + y - 44) * 8.7 - elevation(x, y),
  };
}
export function parcelPosition(id: number) {
  const n = id - 1,
    district = Math.floor(n / 1024),
    local = n % 1024;
  return {
    ...project(
      23 + (district % 2) * 6 + (local % 32) * 0.16,
      25 + Math.floor(district / 2) * 6 + Math.floor(local / 32) * 0.16,
    ),
    district_id: district + 1,
  };
}
export function districtPosition(id: number) {
  return project(
    25.48 + ((id - 1) % 2) * 6,
    27.48 + Math.floor((id - 1) / 2) * 6,
  );
}
export function normalizeNick(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}
