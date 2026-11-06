export type Resident = {
  id: string;
  nick: string;
  avatar: number;
  parcel_id: number;
  created_at?: string;
  x?: number;
  y?: number;
  district_id?: number;
  origin?: "web" | "comment";
  alias?: string | null;
};
export type District = {
  id: number;
  name: string;
  x: number;
  y: number;
  residents: number;
  capacity: number;
};
export type WorldObject = {
  id: string;
  kind: "house" | "tree" | "port" | "farm" | "road" | "flag";
  name: string;
  x: number;
  y: number;
};
export type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  zoom: number;
};
