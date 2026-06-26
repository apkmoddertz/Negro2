export interface CredentialsStatus {
  configured: boolean;
  projectId?: string;
  clientEmail?: string;
}

export interface Match {
  num: number;
  home: string;
  away: string;
  score: string;
  odds: string;
  status?: "win" | "lose" | "pending";
  time?: string;
}

export interface TicketGroup {
  date: string;
  matches: Match[];
}

export interface CategoryData {
  id: string;
  title: string;
  iconName: string;
  tickets: TicketGroup[];
}

export interface TipsSection {
  free: CategoryData[];
  vip: CategoryData[];
}
