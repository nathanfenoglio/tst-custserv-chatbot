"use client"

// import Image from "next/image"
// maybe do some kind of image thing like a logo or something 
import { Message } from "ai"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import ReactMarkDown from "react-markdown";

const Home = () => { 
  // user and logout functions defined in context/AuthContext, useAuth react hook to access firebase auth
  const { user, logout } = useAuth();
  const router = useRouter();

  // useChat hook handles appending the user's question as well as the ai's response
  // useChat hook handles sending messages to the API route chat/route.ts
  // the useChat hook is triggered when the append function is called
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false);

  // messagesEndingRef is a ref to a dummy div after last message for controlling scroll to most recent message
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

  // called in handleSubmit function which is called when user submits question
  const handlePrompt = async (promptText: string) => {
    if (loading) return; // prevent multiple requests

    setLoading(true);

    // append the user's message to previous messages
    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: promptText,
      role: "user",
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
  
    try {
      // send user's email and messages array in POST query to chat backend /api/chat/route.ts
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: user?.email, messages: [...messages, userMessage] }),
      });
  
      const rawText = await response.text(); // read response from route.ts as plain text

      // it's cool that the think response is provided but for the answer that's displayed to the user, remove the thinking text
      // remove the `<think>...</think>` part and extract only the final answer
      const aiResponse = rawText.replace(/<think>[\s\S]*?<\/think>/, "").trim();

      // JSON for AI response 
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        content: aiResponse,
        role: "assistant",
      };

      // append AI response to previous messages
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error("Error fetching AI response:", error);
    } finally {
      setLoading(false); // reset loading state to allow another request
    }
  };
  
  // handle form submission, validate input, pass to handlePrompt
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {

    e.preventDefault(); // prevent default browser form submission behavior, page would refresh and input would be lost

    console.log("Form Submitted, Input: ", input);

    if (input.trim()) {
      handlePrompt(input); // Use the handlePrompt function to add the user's question
      setInput(""); // clear the input box after submitting
    }
  };

  if (!user) return null; // do not load page if user is not logged in

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-gray-900 p-4">
      <main>
        {/* page title */}
        <div className='mt-[6vh] mb-[3vh] text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold'>
          <h1 className='text-center w-[100%] mx-auto text-[#00FFFF]'>TST Customer Service</h1>
          <h1 className='text-center w-[60%] mx-auto text-[#00FFFF]'>Chat Bot</h1>
        </div>

        <div className='w-[100%] mx-auto max-h-[70vh] overflow-y-auto'>
          {/* map user and ai messages onto their respective textbubbles */}
          {/* control justify and text color based on message.role (user or ai) */}
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
                {/* trying to get bulletpoints, newlines from ai response to work... */}
                <ReactMarkDown>{message.content}</ReactMarkDown>
              </div>
            </div>
          ))}

          {/* empty div used to scroll to bottom of messages */}
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
                onChange={(e) => setInput(e.target.value)} 
                value={input}
                placeholder="Ask a question about TST Customer Service stuff"
              />
              {/* query submit button */}
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

        {/* logout button */}
        <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded-lg mt-4">
          Logout
        </button>
        
      </main>
    </div>
  )

}

export default Home