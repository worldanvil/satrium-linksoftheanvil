export class GraphConfigModel{
  showTags:boolean;
  nodes:NodeOptions;
  links?:LinkOptions;
  dagMode?:DagMode;
}

export interface NodeOptions{
  defaultVisibility: Visibility;
  typeVisibility?: {[key:string]:Visibility}
  displayNodesWithNoLinks?: boolean;
  colorScheme?:NodeColorScheme;
}

export interface LinkOptions{
  defaultVisibility: Visibility;
  typeVisibility?: {[key:string]:Visibility}
  colorScheme?:LinkColorScheme;
}

export enum NodeColorScheme{
  GROUP = "group", CLUSTER = "cluster"
}

export enum LinkColorScheme{
  GROUP, SOURCE, TARGET
}

export enum Visibility{
  OFF = 0,
  HIDDEN = 1,
  ON = 2,
  HIGHLIGHT = 3
}

export interface GraphData{
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface GraphNode{
  id: string;
  group: string;
  name: string;
  visibility?: Visibility;
  neighbors?: GraphNode[];
}

export interface GraphLink{
  group: string;
  source: string | GraphNode;
  target: string | GraphNode;
  visibility?: Visibility;
}

export enum DagMode{
  NONE = "",
  TOP_DOWN  = "td",
  BOTTOM_UP  = "bu",
  LEFT_RIGHT = "lr",
  RIGHT_LEFT  = "rl",
  NEAR_TO_FAR = "zour",
  FAR_TO_NEAR = "zin",
  RAD_OUTWARDS = "radialout",
  RAD_INWARDS = "radialin"
}