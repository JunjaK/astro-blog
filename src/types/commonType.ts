export interface BlogFrontMatter {
  id?: string;
  title: string;
  created: Date;
  tags?: string[];
  category: string;
  thumbnail: string;
  updated?: Date;
}

export type StringKeyType<T> = {
  [key: string]: T;
};

export interface TechIconType {
  iconUrl: string;
  techName: string;
}
