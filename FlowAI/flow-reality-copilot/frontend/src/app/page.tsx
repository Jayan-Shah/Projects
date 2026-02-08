// /frontend/src/app/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import io, { Socket } from "socket.io-client";
import Webcam from "react-webcam";

// --- CUSTOM HOOK for reliable interval ---
function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current(), delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

type AppState = "IDLE" | "INGESTING" | "COOKING" | "ERROR";
type GuidanceStep = { creator_instruction: string; [key: string]: any };

let socket: Socket;

export default function Home() {
  // --- STATE MANAGEMENT ---
  const [appState, setAppState] = useState<AppState>("IDLE");
  const [url, setUrl] = useState("");
  const [feedback, setFeedback] = useState("Welcome! Paste a URL to begin.");
  const [guidanceModel, setGuidanceModel] = useState<GuidanceStep[] | null>(
    null
  );
  const [currentStep, setCurrentStep] = useState(0);
  const webcamRef = useRef<Webcam>(null);

  // --- SOCKET.IO & EVENT HANDLING ---
  useEffect(() => {
    const BACKEND_URL =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    socket = io(BACKEND_URL, { path: "/socket.io/" });

    socket.on("connect", () => console.log("Connected to backend:", socket.id));
    socket.on("disconnect", () => console.log("Disconnected from backend"));

    socket.on("new_feedback", (data: { text: string }) => {
      setFeedback(data.text);
      const utterance = new SpeechSynthesisUtterance(data.text);
      window.speechSynthesis.speak(utterance);
    });

    socket.on("next_step", (data: { instruction: string; step: number }) => {
      setCurrentStep(data.step - 1);
      const nextStepText = `Great! Moving to step ${data.step}: ${data.instruction}`;
      setFeedback(nextStepText);
      const utterance = new SpeechSynthesisUtterance(nextStepText);
      window.speechSynthesis.speak(utterance);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // --- CORE LOGIC ---
  const handleStart = async () => {
    if (!url || !url.startsWith("http"))
      return alert("Please enter a valid URL.");
    setAppState("INGESTING");
    setFeedback("Analyzing your tutorial... This may take a moment.");
    try {
      const response = await fetch("http://localhost:8000/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const result = await response.json();

      if (result.status === "error") throw new Error(result.message);

      setGuidanceModel(result.data);
      socket.emit("start_session", { model_id: result.model_id });
      setAppState("COOKING");
      setFeedback(`Let's begin! Step 1: ${result.data[0].creator_instruction}`);
    } catch (error: any) {
      setAppState("ERROR");
      setFeedback(`Error: ${error.message}`);
    }
  };

  const captureAndSendFrame = useCallback(() => {
    if (webcamRef.current && socket) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        socket.emit("process_frame", { image: imageSrc });
      }
    }
  }, [webcamRef, socket]);

  useInterval(captureAndSendFrame, appState === "COOKING" ? 4000 : null); // Send frame every 4s when cooking

  // --- UI RENDERING ---
  const renderContent = () => {
    switch (appState) {
      case "COOKING":
        return (
          <div className="w-full max-w-4xl">
            <div className="relative border-4 border-cyan-400 rounded-lg overflow-hidden shadow-2xl">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="w-full h-auto"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-4 backdrop-blur-sm">
                <p className="text-lg font-semibold text-cyan-300">
                  STEP {currentStep + 1}
                </p>
                <p className="text-xl">
                  {guidanceModel?.[currentStep]?.creator_instruction ||
                    "Loading..."}
                </p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-gray-800 rounded-lg w-full">
              <p className="text-xl font-bold text-cyan-400">
                Flow's Feedback:
              </p>
              <p className="text-lg min-h-[56px]">{feedback}</p>
            </div>
          </div>
        );
      case "INGESTING":
      case "ERROR":
      case "IDLE":
      default:
        return (
          <div className="w-full max-w-lg text-center">
            <h1 className="text-6xl font-bold mb-2">Flow</h1>
            <p className="text-xl mb-8 text-cyan-300">
              Turn any tutorial into a live coaching session.
            </p>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a YouTube recipe or DIY URL..."
              className="w-full px-4 py-3 text-lg text-black rounded-md border-2 border-gray-500 focus:border-cyan-400 focus:outline-none"
              disabled={appState === "INGESTING"}
            />
            <button
              onClick={handleStart}
              disabled={appState === "INGESTING"}
              className="w-full mt-4 px-4 py-3 bg-cyan-500 text-white font-bold text-lg rounded-md hover:bg-cyan-600 transition-all disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {appState === "INGESTING"
                ? "Analyzing..."
                : "Start Guided Experience"}
            </button>
            {appState === "ERROR" && (
              <p className="mt-4 text-red-400">{feedback}</p>
            )}
          </div>
        );
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-900 text-white">
      {renderContent()}
    </main>
  );
}
