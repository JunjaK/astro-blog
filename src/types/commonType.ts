export interface BlogFrontMatter {
  id?: string;
  title: string;
  created: string;
  tags: string[];
  category: string;
  thumbnail: string;
}

export type StringKeyType<T> = {
  [key: string]: T;
};

export interface TechIconType {
  iconUrl: string;
  techName: string;
}
