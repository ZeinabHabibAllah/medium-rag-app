import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: process.env.OPENAI_BASE_URL!,
});

const SYSTEM_PROMPT = `You are a Medium-article assistant that answers questions strictly and only based on the Medium articles dataset context provided to you (metadata and article passages). You must not use any external knowledge, the open internet, or information that is not explicitly contained in the retrieved context. If the answer cannot be determined from the provided context, respond: "I don't know based on the provided Medium articles data."

Always explain your answer using the given context, quoting or paraphrasing the relevant article passage or metadata when helpful.

Additional rules:
- Make a genuine effort to find the answer in the retrieved passages.
- Look for thematic matches, paraphrases, and indirect references.
- For example, "Black Death", "plague", "epidemic", and "pandemic" may relate to the same theme.
- Recommend Medium articles only, never books, podcasts, or external resources.
- When asked for a recommendation, state the Medium article title and author from the retrieved context.
- Follow the user's requested output format exactly.
- If the user asks for only titles, return only titles and nothing else.`;

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }

    const embeddingResponse = await client.embeddings.create({
      model: "4UHRUIN-text-embedding-3-small",
      input: question,
    });
    const queryVector = embeddingResponse.data[0].embedding;

    const searchResults = await index.query({
      vector: queryVector,
      topK: 7,
      includeMetadata: true,
    });

    const contextItems = searchResults.matches.map((match: any) => ({
      article_id: match.metadata?.article_id || "",
      title: match.metadata?.title || "",
      chunk: match.metadata?.chunk || "",
      score: match.score,
    }));

    let contextText = "";
    searchResults.matches.forEach((match: any, i: number) => {
      const m = match.metadata || {};
      contextText += `
Context ${i + 1}
Article ID: ${m.article_id}
Title: ${m.title}
Authors: ${m.authors}
URL: ${m.url}
Retrieved score: ${match.score}

Passage:
${m.chunk}
`;
    });

    const userPrompt = `Question:
${question}

Retrieved Medium article context:
${contextText}

STRICT OUTPUT RULES:
- Answer using only the retrieved Medium article context above.
- Before saying "I don't know", carefully scan all retrieved passages for direct, thematic, paraphrased, or indirect matches.
- Follow the user's requested format exactly.
- If the question says "Return only the titles", output only article titles.
- Do not write "Explanation". Do not add reasons unless asked.
- Do not add authors unless asked.
- If exactly 3 articles are requested, output exactly 3 distinct titles.
- If the answer cannot be determined from the retrieved context, respond with exactly this sentence and nothing else:
I don't know based on the provided Medium articles data.`;

    const chatResponse = await client.chat.completions.create({
      model: "4UHRUIN-gpt-5-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const answer = chatResponse.choices[0].message.content;

    return NextResponse.json({
      response: answer,
      context: contextItems,
      Augmented_prompt: {
        System: SYSTEM_PROMPT,
        User: userPrompt,
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}