import { supabase } from "./supabase";

// Save or update current session
export async function saveSession(userId, userEmail, userName, sessionData) {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .insert([{
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        journal_text: sessionData.journalText || "",
        emotion_data: sessionData.emotion || {},
        image_reaction: sessionData.imageReaction || {},
        drawing_data: sessionData.drawing || "",
        drawing_description: sessionData.drawingDescription || "",
        drawing_analysis: sessionData.drawingAnalysis || {},
        color_fill: sessionData.colorFill || {},
        chatbot_messages: sessionData.chatbot || [],
        for_you_data: sessionData.forYou || {}
      }])
      .select();

    if (error) throw error;
    return data[0];
  } catch (e) {
    console.error("saveSession error:", e);
    return null;
  }
}

// Update existing session by id
export async function updateSession(sessionId, updates) {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .update(updates)
      .eq("id", sessionId)
      .select();

    if (error) throw error;
    return data[0];
  } catch (e) {
    console.error("updateSession error:", e);
    return null;
  }
}

// Get all sessions for a user
export async function getUserSessions(userId) {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("getUserSessions error:", e);
    return [];
  }
}

// Save report
export async function saveReport(userId, reportText, sessionCount) {
  try {
    const { data, error } = await supabase
      .from("reports")
      .upsert([{
        user_id: userId,
        report_text: reportText,
        session_count: sessionCount
      }], { onConflict: "user_id" })
      .select();

    if (error) throw error;
    return data[0];
  } catch (e) {
    console.error("saveReport error:", e);
    return null;
  }
}

// Get latest report for user
export async function getUserReport(userId) {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    return data?.[0] || null;
  } catch (e) {
    console.error("getUserReport error:", e);
    return null;
  }
}

// Convert supabase session format to app format
export function formatSession(s) {
  return {
    id: s.id,
    date: s.created_at,
    journalText: s.journal_text,
    emotion: s.emotion_data,
    imageReaction: s.image_reaction,
    drawing: s.drawing_data,
    drawingDescription: s.drawing_description,
    drawingAnalysis: s.drawing_analysis,
    colorFill: s.color_fill,
    chatbot: s.chatbot_messages,
    forYou: s.for_you_data
  };
}