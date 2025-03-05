export interface BlogFrontMatter {
  id?: string;
  title: string;
  created: Date;
  tags?: string[];
  category: string;
  thumbnail?: string;
  updated?: Date;
}

export interface ProjectInfo {
  title: string;
  duration: string;
  techStacks?: string[];
  thumbnail?: string;
  description?: string;
  order: number;
}

export type StringKeyType<T> = {
  [key: string]: T;
};

export interface TechIconType {
  iconUrl: string;
  techName: string;
}

export type TechStackType = StringKeyType<TechIconType>;
