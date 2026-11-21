// Shared types for the whole app.
// Field names match the Supabase columns in supabase/schema.sql,
// so a database row can be used as one of these types directly.
// If you change a field here, change the schema and the seed files too.

/** The profile used as "you" until real login is added. */
export const DEMO_USER_ID = "demo-you";

export const CATEGORIES = ["internship", "club", "research", "fellowship"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  internship: "Internship",
  club: "Club",
  research: "Research",
  fellowship: "Fellowship",
};

export interface Opportunity {
  id: string;
  title: string;
  organization: string;
  category: Category;
  description: string;
  /** Topic tags, like "robotics" or "finance". Used by search and the match score. */
  tags: string[];
  /** Skills that help, like "Python". Used by the match score. */
  skills: string[];
  /** Majors this fits best. Empty means open to all majors. */
  majors: string[];
  /** Hard requirements, like "COMS W3134". Peter owns this field. */
  prerequisites: string[];
  location: string | null;
  /** Rough time ask, like "5 hrs/week" or "Full-time summer". */
  commitment: string | null;
  /** ISO date, like "2027-02-01". Null when unknown. */
  deadline: string | null;
  /** True when the deadline is our best guess, not taken from an official page. Screens label it "estimated". */
  deadline_estimated: boolean;
  url: string | null;
  /** Page where we found this listing. */
  source_url: string | null;
  /** True when the name and link were checked on an official page. */
  verified: boolean;
  /** Profile id of a person to coffee chat with about this, if any. */
  contact_profile_id: string | null;
}

export type ProfileRole = "student" | "club_lead" | "researcher" | "alum" | "recruiter";

export interface Profile {
  id: string;
  full_name: string;
  role: ProfileRole;
  headline: string;
  school: string | null;
  class_year: number | null;
  major: string | null;
  bio: string;
  skills: string[];
  /** Courses taken, like "COMS W3134". Checked against opportunity prerequisites. */
  courses: string[];
  interests: string[];
  /** Categories this person wants to see in their deck. */
  looking_for: Category[];
  /** True when this person is open to coffee chats. */
  open_to_chat: boolean;
  avatar_url: string | null;
  linkedin_url: string | null;
  /** True for made-up demo people. Real users are false. */
  is_sample: boolean;
}

export type SwipeDirection = "like" | "pass" | "save";
export type TargetType = "opportunity" | "person";

export interface Swipe {
  target_type: TargetType;
  target_id: string;
  direction: SwipeDirection;
  /** ISO timestamp. */
  created_at: string;
}

/** Where a swipe came from. "demo" marks history loaded from a sample taste. */
export type SwipeSource = "deck" | "detail" | "history" | "demo";

/**
 * One thing that happened, kept forever. `swipes` holds only the latest choice per card,
 * so this log is what lets the recommender see changes of mind and what the score was at the time.
 */
export interface SwipeEvent {
  id: string;
  target_type: TargetType;
  target_id: string;
  /** "undo" cancels the swipe before it. */
  action: SwipeDirection | "undo";
  /** ISO timestamp. */
  created_at: string;
  /** The score on the card when it was swiped. Null when unknown. */
  match_score: number | null;
  /** How many cards into the deck this was. Null outside the deck. */
  position: number | null;
  source: SwipeSource;
}

/** A chat message between two profiles. Matches the `messages` table. */
export interface Message {
  id: string;
  from_profile_id: string;
  to_profile_id: string;
  body: string;
  /** ISO timestamp. */
  created_at: string;
}

export type OutreachKind = "coffee_chat" | "outreach";
export type OutreachStatus = "draft" | "sent" | "replied";

export interface Outreach {
  id: string;
  from_profile_id: string;
  to_profile_id: string;
  opportunity_id: string | null;
  kind: OutreachKind;
  message: string;
  status: OutreachStatus;
  created_at: string;
}

export interface MatchResult {
  /** Whole number from 1 to 10. */
  score: number;
  /** Short reasons shown under "Why this match?". */
  reasons: string[];
}
