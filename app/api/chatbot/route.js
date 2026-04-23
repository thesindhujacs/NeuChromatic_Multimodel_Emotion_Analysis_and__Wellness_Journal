import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const { messages, context, questionNumber } = await request.json();

    const emotion = context?.emotion?.primaryEmotion || context?.emotion || "this emotion";
    const intensity = context?.emotion?.intensity || 5;
    const keywords = context?.emotion?.keywords?.join(", ") || "";
    const imageEmotion = context?.imageReaction?.emotion?.primaryEmotion || context?.imageEmotion || "";
    const drawingEmotion = context?.drawingEmotion || context?.drawingAnalysis?.emotion || "";
    const colorEmotion = context?.colorEmotion || context?.colorFill?.analysis?.emotion || "";
    const mentalHealthNote = context?.mentalHealthNote || context?.emotion?.mentalHealthNote || "";

    // For You page
    if (questionNumber === 99) {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a mental wellness AI. You ALWAYS respond with pure JSON only. Never include any text outside the JSON object. Never use markdown. Never use asterisks. Start response with { and end with }. No explanation before or after."
          },
          {
            role: "user",
            content: "Generate personalized wellness recommendations. Return ONLY this JSON with no other text:\n{\n  \"summary\": \"4-5 sentences specifically about feeling " + emotion + " at intensity " + intensity + "/10 and how the image reaction " + (imageEmotion ? "(" + imageEmotion + ")" : "") + " drawing " + (drawingEmotion ? "(" + drawingEmotion + ")" : "") + " and color " + (colorEmotion ? "(" + colorEmotion + ")" : "") + " all connect to reveal an emotional pattern\",\n  \"phrase\": \"one short powerful healing phrase for someone feeling " + emotion + "\",\n  \"quote\": \"one calming quote related to " + emotion + " with author name\",\n  \"affirmations\": [\"affirmation 1 specifically for " + emotion + "\", \"affirmation 2 for intensity " + intensity + "/10\", \"affirmation 3 for healing\"],\n  \"videos\": [{\"title\": \"youtube search for " + emotion + " relief meditation\", \"reason\": \"helps with " + emotion + "\"}, {\"title\": \"youtube search for emotional healing " + (keywords || emotion) + "\", \"reason\": \"addresses their keywords\"}, {\"title\": \"calming nature sounds for " + emotion + "\", \"reason\": \"soothes the nervous system\"}]\n}"
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 800,
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      return Response.json({ success: true, message: raw });
    }

    // Psychiatric report
    if (questionNumber === 98) {
      const sessions = context?.sessions || [];
      const sessionCount = sessions.length;
      const emotions = sessions.map(s => s.emotion?.primaryEmotion || "unknown");
      const intensities = sessions.map(s => s.emotion?.intensity || 5);
      const avgIntensity = intensities.length > 0
        ? (intensities.reduce((a, b) => a + b, 0) / intensities.length).toFixed(1)
        : 5;
      const emotionFrequency = emotions.reduce((acc, e) => {
        acc[e] = (acc[e] || 0) + 1;
        return acc;
      }, {});
      const dominantEmotion = Object.entries(emotionFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a licensed clinical psychologist. Write professional mental health reports in plain text only. Never use asterisks, never use markdown, never use ** for bold. Use numbered sections. Be thorough and evidence-based."
          },
          {
            role: "user",
            content: "Write a professional clinical wellness report in plain text. No markdown. No asterisks. No ** symbols. Use numbered sections only.\n\nPatient Data:\n- Total sessions: " + sessionCount + "\n- Emotions across sessions: " + emotions.join(", ") + "\n- Average emotional intensity: " + avgIntensity + "/10\n- Dominant emotion: " + dominantEmotion + "\n- Emotion frequency: " + JSON.stringify(emotionFrequency) + "\n- Session details: " + JSON.stringify(sessions.slice(0, 7).map(s => ({
              date: s.date,
              emotion: s.emotion?.primaryEmotion,
              intensity: s.emotion?.intensity,
              keywords: s.emotion?.keywords,
              imageEmotion: s.imageReaction?.emotion?.primaryEmotion,
              drawingEmotion: s.drawingAnalysis?.emotion,
              colorEmotion: s.colorFill?.analysis?.emotion,
              journalExcerpt: s.journalText?.slice(0, 100)
            }))) + "\n\nWrite these exact 7 sections. Each section heading on its own line followed by the content:\n\n1. CLINICAL SUMMARY\n[Overall emotional pattern and what it suggests]\n\n2. MULTIMODAL ANALYSIS\n[What journal plus image plus drawing plus color reveals together]\n\n3. EMOTIONAL TRAJECTORY\n[How emotions changed across sessions]\n\n4. KEY OBSERVATIONS\n[3-4 specific clinical observations]\n\n5. RISK INDICATORS\n[Patterns that warrant gentle attention, be measured not alarmist]\n\n6. RECOMMENDATIONS\n[Specific therapeutic approaches for this emotional profile]\n\n7. STRENGTHS OBSERVED\n[Positive patterns and resilience indicators]\n\nBe specific. Reference their actual emotions and session data. Write in compassionate clinical language."
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.6,
        max_tokens: 1500,
      });

      const reply = completion.choices[0]?.message?.content || "";
      return Response.json({ success: true, message: reply });
    }

    // Regular chatbot — 3 questions
    const systemPrompt = "You are Neu, a compassionate AI emotional wellness companion. You are warm, empathetic, non-judgmental and psychologically insightful. Always reference their specific emotions. Never use generic phrases. Never use asterisks or markdown.";

    let userInstruction = "";

    if (questionNumber === 0) {
      userInstruction = "The user just completed a full emotional analysis session. Results:\n- Journal emotion: " + emotion + " (intensity " + intensity + "/10)\n- Keywords: " + keywords + "\n- Image reaction emotion: " + (imageEmotion || "not captured") + "\n- Drawing emotion: " + (drawingEmotion || "not captured") + "\n- Color choices reveal: " + (colorEmotion || "not captured") + "\n\nAsk ONE deep specific question about WHY they feel " + emotion + " today. Reference at least one of their multimodal results (image/drawing/color). Be warm and personal. Maximum 3 sentences. Do not introduce yourself. Just ask the question.";

    } else if (questionNumber === 1) {
      userInstruction = "The user responded to your first question. Now ask them how often they experience " + emotion + " and what specific situations or people tend to trigger it. Reference something they just shared in their response. Be compassionate and curious. Maximum 3 sentences.";

    } else if (questionNumber === 2) {
      userInstruction = "The user has answered your second question. Now gently ask: does " + emotion + " truly capture what they are feeling, or is there a deeper emotion underneath? Also ask how this is currently affecting their daily life. Be gentle and insightful. Maximum 3 sentences.";

    } else {
      userInstruction = "The user has answered all 3 reflection questions. Write a warm closing message of 4-5 sentences that: acknowledges their specific emotion " + emotion + " and their courage in reflecting today, gives one key insight connecting what their journal writing and drawings and color choices revealed together, offers one specific actionable suggestion for their mental wellness this week, ends with an encouraging note. Do not use asterisks or markdown.";
    }

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
        { role: "user", content: userInstruction }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.85,
      max_tokens: 300,
    });

    const reply = completion.choices[0]?.message?.content || "";
    return Response.json({ success: true, message: reply });

  } catch (error) {
    console.error("Chatbot error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}