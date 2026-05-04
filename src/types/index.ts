export type Gender = 'male' | 'female' | 'non-binary' | 'prefer-not-to-say'
export type Intent = 'dating' | 'networking' | 'exploring' | 'friends' | 'open'
export type AnonymityPreference = 'anonymous' | 'semi' | 'open'
export type PassionLevel = 'interested' | 'passionate' | 'obsessed'
export type RoomStatus = 'active' | 'closed' | 'revealed'
export type InviteStatus = 'pending' | 'accepted' | 'expired'
export type VenueTier = 'listed' | 'active' | 'featured'
export type VenueCategory = 'cafe' | 'coworking' | 'airport' | 'gym' | 'mall' | 'other'

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  gender: Gender | null
  age: number | null
  occupation: string | null
  bio: string | null
  avatar_url: string | null
  intent: Intent | null
  gender_preference: string | null
  age_min: number
  age_max: number
  anonymity_preference: AnonymityPreference
  is_onboarded: boolean
  is_male_verified: boolean
  recommendation_score: number
  created_at: string
  updated_at: string
}

export interface UserInterest {
  id: string
  user_id: string
  category: string
  subcategory: string | null
  passion_level: PassionLevel
  created_at: string
}

export interface PersonalityResponse {
  id: string
  user_id: string
  question_1: string | null
  question_2: string | null
  question_3: string | null
  ai_personality_vector: Record<string, unknown> | null
  created_at: string
}

export interface Room {
  id: string
  user_1_id: string
  user_2_id: string
  status: RoomStatus
  timer_expires_at: string
  timer_extended: boolean
  extension_requested_by_1: boolean
  extension_requested_by_2: boolean
  reveal_requested_by_1: boolean
  reveal_requested_by_2: boolean
  icebreaker: string | null
  session_intent: string | null
  venue_name: string | null
  venue_lat: number | null
  venue_lng: number | null
  created_at: string
  closed_at: string | null
}

export interface Message {
  id: string
  room_id: string
  sender_id: string
  content: string
  created_at: string
}

export interface Invite {
  id: string
  inviter_id: string
  invite_code: string
  invitee_phone: string | null
  invitee_id: string | null
  status: InviteStatus
  expires_at: string
  created_at: string
}

export interface VenueSpot {
  id: string
  name: string
  address: string | null
  lat: number
  lng: number
  category: VenueCategory
  crowd_profile: Record<string, number> | null
  peak_times: Record<string, unknown> | null
  tier: VenueTier
  is_active: boolean
  active_user_count?: number
  offers?: VenueOffer[]
  created_at: string
}

export interface VenueOffer {
  id: string
  venue_id: string
  title: string
  description: string | null
  discount_percent: number | null
  valid_until: string | null
  is_active: boolean
  created_at: string
}

export const INTEREST_CATEGORIES = {
  Tech: ['AI/ML', 'Web Dev', 'Startups', 'Crypto', 'Gaming', 'Robotics'],
  Arts: ['Photography', 'Painting', 'Design', 'Film', 'Architecture', 'Theatre'],
  Music: ['Classical', 'Jazz', 'Hip-Hop', 'Electronic', 'Indie', 'Carnatic'],
  Sports: ['Cricket', 'Football', 'Running', 'Cycling', 'Yoga', 'Swimming'],
  Books: ['Fiction', 'Non-Fiction', 'Philosophy', 'Self-Help', 'Poetry', 'Comics'],
  Food: ['Cooking', 'Fine Dining', 'Street Food', 'Baking', 'Wine', 'Coffee'],
  Travel: ['Backpacking', 'Luxury', 'Solo Travel', 'Road Trips', 'Adventure', 'Culture'],
  Business: ['Entrepreneurship', 'Finance', 'Marketing', 'VC/Investing', 'Consulting', 'Leadership'],
  Outdoors: ['Hiking', 'Camping', 'Rock Climbing', 'Surfing', 'Wildlife', 'Astronomy'],
  Wellness: ['Meditation', 'Mental Health', 'Fitness', 'Nutrition', 'Spirituality', 'Journaling'],
} as const

export const PERSONALITY_QUESTIONS = [
  "Describe your perfect Saturday in 2 sentences.",
  "What's the last thing you learned that genuinely surprised you?",
  "What do you geek out about that most people don't get?",
] as const
