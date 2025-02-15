import { DataAPIClient } from "@datastax/astra-db-ts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
// import OpenAI from "openai";
import pdf from "pdf-parse"; // for pdf
import mammoth from "mammoth"; // for docx
import fs from "fs"; // for text
import "dotenv/config";

type SimilarityMetric = "dot_product" | "cosine" | "euclidean";

// const { ASTRA_DB_NAMESPACE, ASTRA_DB_COLLECTION, ASTRA_DB_API_ENDPOINT, ASTRA_DB_APPLICATION_TOKEN, OPENAI_API_KEY } = process.env;
const { ASTRA_DB_NAMESPACE, ASTRA_DB_COLLECTION, ASTRA_DB_API_ENDPOINT, ASTRA_DB_APPLICATION_TOKEN } = process.env;

// Validate environment variables
const validateEnvVariables = () => {
  const requiredVars = {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    // OPENAI_API_KEY,
  };

  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value || typeof value !== "string") {
      console.error(`Environment variable ${key} is missing or not a valid string.`);
      return false;
    }
  }

  return true;
};

// Terminate if any environment variable is missing or invalid
if (!validateEnvVariables()) {
  process.exit(1);
}

// const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const filePaths = [
  "./documents/sams_virtual.docx",
  "./documents/WalmartMoreThan98CartonsProcess.docx",
  "./documents/PlantAddresses.docx",
  "./documents/BundlingBusinessEmailTake2.docx",
  "./documents/AmazonResponses.docx",
  "./documents/CostcoNotes.docx",
  "./documents/WalmartDSV.docx",
];

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);

// adding the '!' at the end of ASTRA_DB_API_ENDPOINT 
// tells typescript that it will never be null since you already checked above in validateEnvVariables function
const db = client.db(ASTRA_DB_API_ENDPOINT!, { namespace: ASTRA_DB_NAMESPACE });

// define langchain's RecursiveCharacterTextSplitter parameters
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  // chunkOverlap: 100,
  chunkOverlap: 200,
});

// choosing to drop and recreate the collection in Astra DB
// so that updated documents stored in the folder will be updated and new documents added
// avoiding duplicate info being written in the collection
// const recreateCollection = async (similarityMetric: SimilarityMetric = "dot_product") => {
const recreateCollection = async (similarityMetric: SimilarityMetric = "cosine") => {
  try {
    // drop the existing collection if it exists
    try {
      await db.collection(ASTRA_DB_COLLECTION!).drop();
      console.log(`Dropped collection: ${ASTRA_DB_COLLECTION}`);
    } catch (error) {
      console.warn(`No existing collection to drop: ${ASTRA_DB_COLLECTION}, ${error}`);
    }

    // create the collection again or for the 1st time
    // using the similarity metric and 1536 dimensions -> changed to 768 dimensions now that using nomic-embed-text
    const res = await db.createCollection(ASTRA_DB_COLLECTION!, {
      vector: {
        // dimension: 1536,
        dimension: 768,
        metric: similarityMetric,
      },
    });
    console.log(`Created collection: ${ASTRA_DB_COLLECTION}`, res);
  } catch (error) {
    console.error(`Error recreating collection: ${error}`);
    throw error;
  }
};

const loadSampleData = async () => {
  // get reference to the collection you just created
  const collection = await db.collection(ASTRA_DB_COLLECTION!);

  // get content for each file specified in file paths
  for (const filePath of filePaths) {
    try {
      let content: string;

      // Load content based on file type
      if (filePath.endsWith(".pdf")) {
        content = await loadPDF(filePath);
      } else if (filePath.endsWith(".docx")) {
        content = await loadDocx(filePath);
      } else if (filePath.endsWith(".txt")) {
        content = await loadText(filePath);
      } else {
        console.warn(`Unsupported file type: ${filePath}`);
        continue;
      }

      // split content into chunks for vectorization using langchain RecursiveCharacterTextSplitter
      const chunks = await splitter.splitText(content);

      // create embedding (numerical representation) for each chunk
      for await (const chunk of chunks) {
        // const embedding = await openai.embeddings.create({
        //   model: "text-embedding-3-small",
        //   input: chunk,
        //   encoding_format: "float",
        // });

        // // get vector and insert the embedding (numerical representation) and text representation into the databsase collection
        // const vector = embedding.data[0].embedding;
        async function getEmbedding(text: string) {
          // send chunk to Ollama's nomic-embed-text model
          const response = await fetch("http://localhost:11434/api/embeddings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "nomic-embed-text",
              prompt: text,
            }),
          });
        
          const data = await response.json();
          console.log("📌 Embedding API Response:", data); // 🛠 Debugging
          if (!data || !data.embedding) {
            console.error("❌ ERROR: Embedding API did not return valid data");
            return null; // Ensure we don't try to access `length` on `undefined`
          }

          return data.embedding;  
        }
        
        // Get embedding for the chunk
        const vector = await getEmbedding(chunk);
        console.log("📌 Storing embedding vector:", vector.length, vector.slice(0, 5)); // DEBUG: Log first 5 elements

        // insert embedding and text into the collection
        const res = await collection.insertOne({
          $vector: vector,
          text: chunk, 
        });
        console.log(res);
      }
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
    }
  }
};

// loaders for different file types
const loadPDF = async (filePath: string): Promise<string> => { // pdf
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdf(dataBuffer);
  return pdfData.text;
};

const loadDocx = async (filePath: string): Promise<string> => { // docx
  const dataBuffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer: dataBuffer });
  return result.value;
};

const loadText = async (filePath: string): Promise<string> => { // txt
  return fs.readFileSync(filePath, "utf-8");
};

// main function to drop preexisting database, recreate the collection and seed it by loading the data from the specified files
const seedDatabase = async () => {
  await recreateCollection(); // drop and recreate the collection
  await loadSampleData(); // load and insert the data
};

// call seedDatabase to start the process
seedDatabase().catch((error) => {
  console.error("Error during database seeding:", error);
});
