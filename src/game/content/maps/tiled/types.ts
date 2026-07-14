export type TiledChunk = {
  data: number[];
  height: number;
  width: number;
  x: number;
  y: number;
};

export type TiledTileLayer = {
  id: number;
  name: string;
  type: 'tilelayer';
  visible: boolean;
  opacity?: number;
  width: number;
  height: number;
  chunks?: TiledChunk[];
  data?: number[];
  startx?: number;
  starty?: number;
};

export type TiledObject = {
  id: number;
  name: string;
  type?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  visible?: boolean;
  ellipse?: boolean;
  point?: boolean;
  polygon?: Array<{ x: number; y: number }>;
};

export type TiledObjectLayer = {
  id: number;
  name: string;
  type: 'objectgroup';
  visible: boolean;
  objects: TiledObject[];
};

export type TiledTilesetRef = {
  firstgid: number;
  source: string;
};

export type TiledTilesetCollisionObject = TiledObject;

export type TiledTilesetTileCollision = {
  tileId: number;
  objects: TiledTilesetCollisionObject[];
};

export type TiledMapJson = {
  type: 'map';
  version: string;
  tiledversion: string;
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  infinite: boolean;
  layers: Array<TiledTileLayer | TiledObjectLayer>;
  tilesets: TiledTilesetRef[];
};
