import { DataAPIClient } from "@datastax/astra-db-ts";

// Initialize AstraDB
const { ASTRA_DB_NAMESPACE, ASTRA_DB_COLLECTION, ASTRA_DB_API_ENDPOINT, ASTRA_DB_APPLICATION_TOKEN } = process.env;
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT!, { namespace: ASTRA_DB_NAMESPACE });

// get embedding from Ollama's nomic-embed-text embedding model
async function getEmbedding(text: string) {
  // ollama pull nomic-embed-text
  const response = await fetch("http://localhost:11434/api/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
  });

  const data = await response.json();
  console.log("Embedding length:", data.embedding.length); 

  if (!data.embedding || data.embedding.length !== 768) {  // 768 is the nomic-embed-text embedding size
    throw new Error("Invalid embedding size received.");
  }

  return data.embedding;  
}

// Function to query Ollama's LLM for response
// could add temperature: 0.2 to try to make it more factual and less creative 
async function queryOllamaLLM(context: string, question: string) {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-r1",
      prompt: `You are a helpful assistant that answers customer service questions from account documents. Answer based only on the provided context.
      - Answer **directly** and **do not include any reasoning or explanations**.  
      - Do **not** include "<think>" or any thoughts, just provide the **final answer only**.

      ---- CONTEXT ----
      ${context || "No relevant documents found."}
      ---- END CONTEXT ----
      
      QUESTION: ${question}
      ANSWER: `,
      stream: false,
    }),
  });

  const data = await response.json();
  console.log("Ollama Response:", data);
  
  return data.response || "I don't know.";
}

// 🆕 UseChat Hook Handles Sending User Questions Here
export async function POST(req: Request) {
  console.log("📩 Received new POST request");
  try {
    const { messages } = await req.json();
    // get embedding for only last message
    const latestMessage = messages[messages.length - 1]?.content || "";

    // getEmbedding function calls Ollama's nomic-embed-text model
    // to get the vector representation of the user's latest message
    const vector = await getEmbedding(latestMessage);
    
    let docContext = "";  // variable for all the documents returned from AstraDB 

    try {
      // query AstraDB for top 10 most relevant documents
      const collection = await db.collection(ASTRA_DB_COLLECTION!);
      const cursor = collection.find({ text: { $exists: true } }, {
        sort: { $vector: vector },
        limit: 10,
      });

      // convert cursor to array
      const documents = await cursor.toArray();
      
      if (documents.length === 0) {
        console.warn("No relevant documents found.");
      }

      // add numbering to documents for perhaps better readability for model
      docContext = documents.map((doc, index) => `(${index + 1}) ${doc.text}`).join("\n\n");
      
    } catch (error) {
      console.error("AstraDB Retrieval Error:", error);
      docContext = "No relevant documents found.";
    }

    // send context from astraDB + user question to deepseek-r1 model
    const answer = await queryOllamaLLM(docContext, latestMessage);

    // return response to frontend
    return new Response(answer);
    
  } catch (error) {
    console.error("Error in API Route:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
