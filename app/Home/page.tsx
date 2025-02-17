"use client"

// import Image from "next/image"
// maybe do some kind of image thing 
// import { useChat } from "ai/react" 
import { Message } from "ai"
import { useState, useEffect, useRef } from "react"

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

const Home = () => { 
  // user and logout functions defined in context/AuthContext, useAuth react hook to access firebase auth
  const { user, logout } = useAuth();
  const router = useRouter();

  // useChat hook handles appending the user's question as well as the ai's response
  // useChat hook handles sending messages to the API route chat/route.ts
  // the useChat hook is triggered when the append function is called
  // const { append, messages } = useChat()
  // DECIDED NOT TO USE useChat hook BECAUSE WAS TRIGGERING MULTIPLE SENDS 
  // INSTEAD SETTING messages MANUALLY
  const [messages, setMessages] = useState<Message[]>([])
  
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false);

  const messagesEndingRef = useRef<HTMLDivElement | null>(null);

  // if user doesn't exist from useAuth hook, redirect to login page
  useEffect(() => {
    if (!user) {
      router.push("/Login");
    }
  }, [user, router]);
  
  // scroll to bottom of messages, messagesEndingRef is a ref to a dummy div after last message
  useEffect(() => {
    if (messagesEndingRef.current) {
      messagesEndingRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // use openai append function to add user's question
  // const handlePrompt = (promptText: string) => {
  //   const msg: Message = {
  //     id: crypto.randomUUID(),
  //     content: promptText,
  //     role: "user",
  //   }
  //   append(msg)
  // }

  const handlePrompt = async (promptText: string) => {
    if (loading) return; // Prevent multiple requests

    setLoading(true);

    // Append the user's message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: promptText,
      role: "user",
    };
    // append(userMessage);
    setMessages((prevMessages) => [...prevMessages, userMessage]);
  
    try {
      // send user's query to backend /api/chat/route.ts
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });
  
      // const data = await response.json();
      // console.log("Ollama Response:", data); // Debugging: Check in console
  
      // // Extract AI response
      // // const aiResponse = data.response || "Error: No response received.";
      // const aiResponse = await response.text();

      const rawText = await response.text(); // Read response as plain text

      // it's cool that the think response is provided but for the answer that's displayed to the user, remove the thinking text
      // remove the `<think>...</think>` part and extract only the final answer
      const aiResponse = rawText.replace(/<think>[\s\S]*?<\/think>/, "").trim();
      // console.log("AI Response:", aiResponse); // Debugging: Check response in console

      // NOT USING useChat hook BECAUSE WAS TRIGGERING MULTIPLE SENDS
      // Append AI response to messages
      // append({
      //   id: crypto.randomUUID(),
      //   content: aiResponse,
      //   role: "assistant",
      // });

      // JSON for AI response 
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        content: aiResponse,
        role: "assistant",
      };

      // Append AI response manually
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error("Error fetching AI response:", error);
    } finally {
      setLoading(false); // reset loading state to allow another request
    }
  };
  
  // handle form submission, validate input, pass to handlePrompt
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {

    e.preventDefault(); // Prevent the default form submission behavior

    console.log("Form Submitted, Input: ", input);

    if (input.trim()) {
      handlePrompt(input); // Use the handlePrompt function to add the user's question
      setInput(""); // Clear the input box after submitting
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-gray-900 p-4">
      <main>
        <div className='mt-[6vh] mb-[3vh] text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold'>
          {/* <h1 className='text-center w-[60%] mx-auto text-[#00FFFF]'>Consult the</h1> */}
          <h1 className='text-center w-[100%] mx-auto text-[#00FFFF]'>TST Customer Service</h1>
          <h1 className='text-center w-[60%] mx-auto text-[#00FFFF]'>Chat Bot</h1>
        </div>

        <div className='w-[100%] mx-auto max-h-[70vh] overflow-y-auto'>
          {/* map user and ai messages onto their respective textbubbles */}
          {messages.map((message: Message, index: number) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-4`}
            >
              <div
                className={`max-w-xs md:max-w-md p-4 m-6 rounded-lg text-white ${
                  message.role === "user"
                    ? "bg-blue-500 text-right"
                    : "bg-[#FF69B4] text-black"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          <div ref={messagesEndingRef} />

          {/* user question input box and submit button */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center space-x-4 mt-6 pt-4"
          >
            {/* flex-wrap allows the input and button to wrap onto a new line if not enough space for smaller screens */}
            <div className="flex w-full flex-wrap">
              <input
                className="flex-grow p-3 mr-4 rounded-lg border border-gray-700 bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => setInput(e.target.value)} // Update input state
                value={input}
                placeholder="Ask a question about TST Customer Service stuff"
              />
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors duration-200 sm:mt-0 mt-4"
                disabled={loading}
              >
                Submit
              </button>
            </div>
          </form>

        </div>

        <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded-lg mt-4">
          Logout
        </button>
        
      </main>
    </div>
  )

}

export default Home