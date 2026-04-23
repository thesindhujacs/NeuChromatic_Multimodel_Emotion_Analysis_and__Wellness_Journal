import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const { text } = await request.json();

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert psychologist and emotion analyst. Analyze the emotional content of journal entries. Always respond with valid JSON only, no extra text.`
        },
        {
          role: "user",
          content: `Analyze this journal entry and return ONLY a JSON object with these exact fields:
{
  "primaryEmotion": "one word emotion (e.g. Joy, Sadness, Anxiety, Anger, Fear, Hope, Loneliness, Excitement)",
  "intensity": a number from 1 to 10,
  "emotionColor": "a hex color that represents this emotion (e.g. #FFD700 for joy, #4169E1 for sadness)",
  "keywords": ["array", "of", "3-5", "key", "emotional", "words"],
  "explanation": "2-3 sentences explaining the emotional analysis",
  "mentalHealthNote": "one compassionate sentence about their mental wellness"
}

Journal entry: "${text}"`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 500,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error("Emotion analysis error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}