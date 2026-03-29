export interface Favorite {
  id: number;
  text: string;
  type: string;   // 'word' | 'phrase' | 'idiom' | 'other'
  note?: string;
  createdAt: string;
  updatedAt: string;
}