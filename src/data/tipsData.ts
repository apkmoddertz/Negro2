import { CategoryData } from "../types";

export const freeTips: CategoryData[] = [
  // Today & Onward
  {
    id: "free_banker_today",
    title: "Banker Today",
    iconName: "ThumbsUp",
    tickets: [
      {
        date: "TODAY MATCHES",
        matches: [
          { num: 1, home: "Arsenal", away: "Chelsea", score: "Home Win", odds: "1.65", status: "pending" },
          { num: 2, home: "Real Madrid", away: "Athletic Bilbao", score: "Home Win", odds: "1.40", status: "pending" }
        ]
      }
    ]
  },
  {
    id: "free_3picks_today",
    title: "3Picks Today",
    iconName: "Calendar5",
    tickets: [
      {
        date: "TODAY MATCHES",
        matches: [
          { num: 1, home: "Liverpool", away: "Aston Villa", score: "Over 2.5 Goals", odds: "1.55", status: "pending" },
          { num: 2, home: "Bayern Munich", away: "Frankfurt", score: "Home Win", odds: "1.30", status: "pending" },
          { num: 3, home: "Napoli", away: "Cagliari", score: "Home Win", odds: "1.42", status: "pending" }
        ]
      }
    ]
  },
  {
    id: "free_5picks_today",
    title: "5Picks Today",
    iconName: "Calendar10",
    tickets: [
      {
        date: "TODAY MATCHES",
        matches: [
          { num: 1, home: "Inter Milan", away: "Torino", score: "Home Win", odds: "1.38", status: "pending" },
          { num: 2, home: "Marseille", away: "Auxerre", score: "Over 1.5 Goals", odds: "1.25", status: "pending" },
          { num: 3, home: "Barcelona", away: "Celta Vigo", score: "Home Win", odds: "1.32", status: "pending" },
          { num: 4, home: "PSG", away: "Reims", score: "Home Win", odds: "1.28", status: "pending" },
          { num: 5, home: "Porto", away: "Rio Ave", score: "Home Win", odds: "1.20", status: "pending" }
        ]
      }
    ]
  },
  // Yesterday & Before Results
  {
    id: "free_banker_results",
    title: "Banker Results",
    iconName: "Tv",
    tickets: [
      {
        date: "24 JUNE 2026",
        matches: [
          { num: 1, home: "Atletico Madrid", away: "Mallorca", score: "Home Win", odds: "1.42", status: "win" },
          { num: 2, home: "Sporting CP", away: "Farense", score: "Home Win", odds: "1.22", status: "win" }
        ]
      },
      {
        date: "23 JUNE 2026",
        matches: [
          { num: 1, home: "Juventus", away: "Genoa", score: "Home Win or Draw", odds: "1.20", status: "win" },
          { num: 2, home: "Liverpool", away: "Fulham", score: "Home Win", odds: "1.33", status: "lose" }
        ]
      }
    ]
  },
  {
    id: "free_3picks_results",
    title: "3Picks Results",
    iconName: "PlusMinus",
    tickets: [
      {
        date: "24 JUNE 2026",
        matches: [
          { num: 1, home: "Bayer Leverkusen", away: "Bochum", score: "Home Win", odds: "1.32", status: "win" },
          { num: 2, home: "Benfica", away: "Gil Vicente", score: "Over 1.5", odds: "1.24", status: "win" },
          { num: 3, home: "Inter Milan", away: "Cagliari", score: "Home Win", odds: "1.25", status: "win" }
        ]
      },
      {
        date: "23 JUNE 2026",
        matches: [
          { num: 1, home: "Manchester City", away: "Valencia", score: "Home Win", odds: "1.28", status: "win" },
          { num: 2, home: "Dortmund", away: "Augsburg", score: "Over 2.5 Goals", odds: "1.40", status: "win" },
          { num: 3, home: "Bayern Munich", away: "Mainz", score: "Over 1.5", odds: "1.22", status: "win" }
        ]
      }
    ]
  },
  {
    id: "free_5picks_results",
    title: "5Picks Results",
    iconName: "Wallet",
    tickets: [
      {
        date: "24 JUNE 2026",
        matches: [
          { num: 1, home: "Barcelona", away: "Getafe", score: "Home Win", odds: "1.30", status: "win" },
          { num: 2, home: "Arsenal", away: "Brentford", score: "Home Win", odds: "1.36", status: "win" },
          { num: 3, home: "Paris SG", away: "Nantes", score: "Over 1.5", odds: "1.18", status: "win" },
          { num: 4, home: "Chelsea", away: "Newcastle", score: "Over 2.5 Goals", odds: "1.72", status: "lose" },
          { num: 5, home: "AS Roma", away: "Fiorentina", score: "Both Teams To Score", odds: "1.80", status: "win" }
        ]
      }
    ]
  }
];

export const vipTips: CategoryData[] = [
  // Today & Onward
  {
    id: "vip_elite_today",
    title: "Elite Today",
    iconName: "Crown",
    tickets: [
      {
        date: "TODAY MATCHES",
        matches: [
          { num: 1, home: "Manchester City", away: "Everton", score: "Home Win To Win Both Halves", odds: "1.90", status: "pending" },
          { num: 2, home: "Benfica", away: "Rio Ave", score: "Home To Win To Nil", odds: "1.80", status: "pending" }
        ]
      }
    ]
  },
  {
    id: "vip_htft_today",
    title: "HT/FT Today",
    iconName: "Shuffle",
    tickets: [
      {
        date: "TODAY MATCHES",
        matches: [
          { num: 1, home: "Monaco", away: "Le Havre", score: "HT/FT {Draw/Home}", odds: "3.90", status: "pending" },
          { num: 2, home: "Real Betis", away: "Las Palmas", score: "HT/FT {Home/Home}", odds: "2.50", status: "pending" }
        ]
      }
    ]
  },
  {
    id: "vip_cs_today",
    title: "CS Today",
    iconName: "Trophy",
    tickets: [
      {
        date: "TODAY MATCHES",
        matches: [
          { num: 1, home: "Juventus", away: "Parma", score: "Correct Score {2:0}", odds: "6.00", status: "pending" },
          { num: 2, home: "Sporting CP", away: "Moreirense", score: "Correct Score {3:1}", odds: "9.50", status: "pending" }
        ]
      }
    ]
  },
  // Yesterday & Before Results
  {
    id: "vip_elite_results",
    title: "Elite Results",
    iconName: "Target",
    tickets: [
      {
        date: "24 JUNE 2026",
        matches: [
          { num: 1, home: "Liverpool", away: "Brighton", score: "Home Win & Over 2.5", odds: "1.85", status: "win" },
          { num: 2, home: "Barcelona", away: "Real Betis", score: "Home -1.5 AH", odds: "2.05", status: "win" },
          { num: 3, home: "Juventus", away: "Bologna", score: "Home Win & Under 3.5", odds: "2.15", status: "win" }
        ]
      },
      {
        date: "23 JUNE 2026",
        matches: [
          { num: 1, home: "Paris SG", away: "Lille", score: "Home Win & Over 2.5", odds: "1.80", status: "win" },
          { num: 2, home: "Bayer Leverkusen", away: "Freiburg", score: "Home Win & Over 1.5", odds: "1.62", status: "win" }
        ]
      }
    ]
  },
  {
    id: "vip_htft_results",
    title: "HT/FT Results",
    iconName: "Timer",
    tickets: [
      {
        date: "24 JUNE 2026",
        matches: [
          { num: 1, home: "Aston Villa", away: "Leicester", score: "HT/FT {Draw/Home}", odds: "4.00", status: "win" },
          { num: 2, home: "Eintracht Frankfurt", away: "St. Pauli", score: "HT/FT {Home/Home}", odds: "2.20", status: "win" }
        ]
      }
    ]
  },
  {
    id: "vip_cs_results",
    title: "CS Results",
    iconName: "Zap",
    tickets: [
      {
        date: "24 JUNE 2026",
        matches: [
          { num: 1, home: "Manchester City", away: "Fulham", score: "Correct Score {3:0}", odds: "8.00", status: "win" },
          { num: 2, home: "Paris SG", away: "Brest", score: "Correct Score {2:0}", odds: "6.80", status: "win" }
        ]
      }
    ]
  }
];
