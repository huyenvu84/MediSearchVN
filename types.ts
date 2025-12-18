export interface Source {
  title: string;
  uri: string;
}

export interface SearchResult {
  content: string;
  sources: Source[];
}

export interface SearchState {
  isLoading: boolean;
  data: SearchResult | null;
  error: string | null;
  query: string;
  isOffline?: boolean;
}

export interface HistoryItem {
  query: string;
  timestamp: number;
  lastUpdated?: number; // Timestamp of the last successful API fetch
  note: string;
  cachedResult?: SearchResult;
}