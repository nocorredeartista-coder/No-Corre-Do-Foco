import { GoogleGenAI, Type } from "@google/genai";
import { TASK_DATABASE } from "../data/tasks";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface SuggestedTask {
  text: string;
  duration: number; // minutes
}

export function getRandomLocalTask(): SuggestedTask {
  const randomIndex = Math.floor(Math.random() * TASK_DATABASE.length);
  const task = TASK_DATABASE[randomIndex];
  return {
    text: task.text,
    duration: task.duration
  };
}

export async function getArtistDevelopmentTask(mood: string): Promise<SuggestedTask> {
  const prompt = `Você é um mentor de carreira para artistas independentes. 
  O artista está se sentindo: ${mood}.
  Sugira UMA tarefa prática e rápida (10-25 minutos) para o desenvolvimento da carreira dele hoje.
  Foque em: Composição, Produção, Divulgação nas redes, Networking ou Organização.
  O texto deve ser motivador e direto, no estilo "papo reto".`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: {
              type: Type.STRING,
              description: "A descrição da tarefa sugerida.",
            },
            duration: {
              type: Type.NUMBER,
              description: "Duração sugerida em minutos (10, 15 ou 25).",
            },
          },
          required: ["text", "duration"],
        },
      },
    });

    const result = JSON.parse(response.text || '{"text": "Fazer um post sobre seu processo", "duration": 10}');
    return result as SuggestedTask;
  } catch (error) {
    console.error("Erro ao gerar tarefa:", error);
    return getRandomLocalTask();
  }
}
