import { DataAPIClient } from "@datastax/astra-db-ts";
import fs from "fs";
import path from "path";

// map of user emails to collections in userEmailsCollections.ts
import { userEmailsCollections } from "@/scripts/userEmailsCollections";

// path to log file for logging user queries and chatbot responses 
// process.cwd() returns the current working directory (where the project is running so all the way out to the root of the project)
// path.join() appends the log.txt file to the current working directory path
const logFilePath = path.join(process.cwd(), "log.txt");

// Initialize AstraDB for storing vector embeddings from the chunks of documents
const { ASTRA_DB_NAMESPACE, ASTRA_DB_API_ENDPOINT, ASTRA_DB_APPLICATION_TOKEN } = process.env;
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT!, { namespace: ASTRA_DB_NAMESPACE });

// save all questions and answers to log file
function appendToLog(message: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;

  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) {
      console.error("Error writing to log file:", err);
    }
  });
}

// get embedding from Ollama's nomic-embed-text embedding model for user's question
// astraDB collection is already seeded with backend file loadDb.ts
async function getEmbedding(text: string) {
  // ollama pull nomic-embed-text
  // by default ollama runs api server on port 11434
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
  // log user question to log file
  console.log(`USER QUESTION: ${question}`);
  appendToLog(`USER QUESTION: ${question}`);

  // create POST request to ollama api server including user's question and top 10 similar documents
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // model: "deepseek-r1",
      model: "llama3.2:3b", // faster maybe acceptably faster on 4.0 VRAM GPU
      // model: "deepseek-r1:1.5b-qwen-distill-q8_0", // faster than deepseek-r1 but terrible answers
      prompt: `You are a helpful assistant that answers customer service questions from account documents. Answer based only on the provided context.
      - Answer **directly** and **do not include any reasoning or explanations**.  
      - Do **not** include "<think>" or any thoughts, just provide the **final answer only**.
      - If the question is not related to account documents, answer "I don't know."

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
  console.log(`OLLAMA RESPONSE: ${data.response}`);
  // log ollama response to log file
  appendToLog(`OLLAMA RESPONSE: ${data.response}`);
  
  return data.response || "I don't know.";
}

// POST request is sent from Home/page.tsx
// and contains user's email address and question
// this function is automatically triggered when the POST request from Home/page.tsx is sent to this route api/chat
export async function POST(req: Request) {
  console.log("📩 Received new POST request");
  try {
    // get user email to determine which collection they are allowed to query and messages array
    const { email, messages } = await req.json();
    // get embedding for only last message
    const latestMessage = messages[messages.length - 1]?.content || "";

    // getEmbedding function calls Ollama's nomic-embed-text model
    // to get the vector representation of the user's latest message
    const vector = await getEmbedding(latestMessage);
    
    let docContext = "";  // variable for all the documents returned from AstraDB 

    try {
      if (!userEmailsCollections.has(email)) { 
        throw new Error(`No collection found for email: ${email}`);
      }
      // get user's collection name from the email of the user logged in
      const collection = await db.collection(userEmailsCollections.get(email)!);
      
      // query AstraDB for top 10 most relevant documents
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

    // send context from astraDB + user question to ai model
    // could perhaps send some previous or all previous messages to the model to improve context...
    const answer = await queryOllamaLLM(docContext, latestMessage);

    // return response to frontend Home/page.tsx
    return new Response(answer);
    
  } catch (error) {
    console.error("Error in API Route:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
