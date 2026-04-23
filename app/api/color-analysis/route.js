 import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const { colors, question, drawingDescription } = await request.json();

    const prompt = colors
      ? `A user filled regions of an abstract image with these colors: ${colors.join(", ")}. 
         Analyze the psychological meaning of these color choices. What emotions do they suggest?
         Return JSON: { "emotion": "primary emotion", "meaning": "2-3 sentence analysis", "colorMeanings": {"color": "meaning"} }`
      : `A user was asked: "${question}" and made a drawing described as: "${drawingDescription}".
         Analyze the psychological and emotional content of this drawing response.
         Return JSON: { "emotion": "primary emotion", "intensity": 1-10, "analysis": "2-3 sentence psychological analysis", "insight": "one deep insight" }`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are an art therapist and psychologist. Analyze drawings and color choices for emotional meaning. Return only valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 400,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return Response.json({ success: true, data: result });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}