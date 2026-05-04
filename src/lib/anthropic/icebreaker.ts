import { anthropic } from './client'

interface UserContext {
  interests: { category: string; subcategory?: string; passion_level: string }[]
  personality: { question_1?: string; question_2?: string; question_3?: string }
  intent: string
}

export async function generateIcebreaker(
  user1: UserContext,
  user2: UserContext,
  venueName?: string
): Promise<string> {
  const prompt = `You are generating an icebreaker for two people who've been anonymously matched on Latent, a real-world connection app. They are physically nearby${venueName ? ` at ${venueName}` : ''}.

User 1 profile:
- Interests: ${user1.interests.map(i => `${i.subcategory || i.category} (${i.passion_level})`).join(', ')}
- Here for: ${user1.intent}
- Says: "${user1.personality.question_1}" / "${user1.personality.question_2}"

User 2 profile:
- Interests: ${user2.interests.map(i => `${i.subcategory || i.category} (${i.passion_level})`).join(', ')}
- Here for: ${user2.intent}
- Says: "${user2.personality.question_1}" / "${user2.personality.question_2}"

Generate ONE icebreaker statement. Rules:
- It must reference something SPECIFIC and TRUE about both of them
- It should feel like someone who read both profiles carefully — not generic
- It's a statement, not a question — something that makes them both smile and want to respond
- Under 25 words
- No emojis
- Don't mention their specific answers verbatim — infer from them
- Example of BAD: "You both like technology and travel"
- Example of GOOD: "You're probably the only two people here who've had a conversation about AI that didn't end with someone saying 'but what about jobs'"

Return ONLY the icebreaker text. Nothing else.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }],
  })

  return (message.content[0] as { type: string; text: string }).text.trim()
}

export async function extractPersonalityVector(responses: {
  question_1: string
  question_2: string
  question_3: string
}): Promise<Record<string, unknown>> {
  const prompt = `Analyze these three responses from a person and extract personality signals as a JSON object.

Q1 (Perfect Saturday): "${responses.question_1}"
Q2 (Last surprising thing learned): "${responses.question_2}"
Q3 (What they geek out about): "${responses.question_3}"

Return a JSON object with these keys:
- energy: "introvert" | "extrovert" | "ambivert"
- pace: "slow" | "medium" | "fast"
- curiosity: "low" | "medium" | "high"
- creativity: "low" | "medium" | "high"
- social_orientation: "one-on-one" | "small-group" | "large-group"
- intellectual_depth: "surface" | "moderate" | "deep"
- primary_values: string[] (max 3, e.g. ["adventure", "connection", "growth"])
- communication_style: "brief" | "elaborate"
- top_themes: string[] (max 3 keywords extracted from their answers)

Return ONLY valid JSON. No explanation.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  try {
    const text = (message.content[0] as { type: string; text: string }).text.trim()
    return JSON.parse(text)
  } catch {
    return {}
  }
}
