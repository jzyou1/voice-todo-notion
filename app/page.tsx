"use client";

import { useEffect, useRef, useState } from "react";

type Todo = { id: string; text: string };
type Status = "idle" | "loading" | "success" | "error";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecognition = any;

function getSpeechRecognition(): (new () => AnyRecognition) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [interim, setInterim] = useState("");
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const recognitionRef = useRef<AnyRecognition>(null);

  useEffect(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;
    const rec = new SR();
    rec.lang = "ja-JP";
    rec.continuous = true;
    rec.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) {
            setTodos((prev) => [
              ...prev,
              { id: crypto.randomUUID(), text },
            ]);
          }
          setInterim("");
        } else {
          interimText += result[0].transcript;
        }
      }
      setInterim(interimText);
    };

    rec.onend = () => {
      setRecording(false);
      setInterim("");
    };

    recognitionRef.current = rec;
  }, []);

  function toggleRecording() {
    if (!getSpeechRecognition()) {
      alert("このブラウザは音声認識に対応していません（Chromeを使ってください）");
      return;
    }
    const rec = recognitionRef.current;
    if (!rec) return;
    if (recording) {
      rec.stop();
    } else {
      setStatus("idle");
      setMessage("");
      rec.start();
      setRecording(true);
    }
  }

  function updateTodo(id: string, text: string) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t)));
  }

  function removeTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  async function submitToNotion() {
    if (todos.length === 0) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/add-todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todos: todos.map((t) => t.text) }),
      });
      if (!res.ok) throw new Error(await res.text());
      setTodos([]);
      setStatus("success");
      setMessage(`${todos.length}件をNotionのINBOXに追加しました`);
    } catch (e) {
      setStatus("error");
      setMessage("エラーが発生しました: " + String(e));
    }
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">
        やり残しTODO
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        話しかけると Notion の INBOX にタスクを追加します
      </p>

      {/* マイクボタン */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <button
          onClick={toggleRecording}
          className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
            recording
              ? "bg-red-500 hover:bg-red-600 animate-pulse"
              : "bg-white hover:bg-gray-100 border-2 border-gray-200"
          }`}
          aria-label={recording ? "録音停止" : "録音開始"}
        >
          <svg
            className={`w-10 h-10 ${recording ? "text-white" : "text-gray-600"}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm6.364 9.414a.75.75 0 0 1 1.49.172A7.5 7.5 0 0 1 12.75 18.45V21h2.25a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1 0-1.5h2.25v-2.55A7.5 7.5 0 0 1 4.146 10.586a.75.75 0 1 1 1.49-.172 6 6 0 0 0 11.728 0z" />
          </svg>
        </button>
        <p className="text-sm font-medium text-gray-600">
          {recording ? "録音中… 話してください" : "タップして録音開始"}
        </p>
        {interim && (
          <p className="text-sm text-gray-400 italic">{interim}…</p>
        )}
      </div>

      {/* TODOリスト */}
      {todos.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            追加するタスク ({todos.length}件)
          </h2>
          <ul className="space-y-2">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100"
              >
                <span className="text-gray-400 text-lg">📝</span>
                <input
                  type="text"
                  value={todo.text}
                  onChange={(e) => updateTodo(todo.id, e.target.value)}
                  className="flex-1 text-gray-800 bg-transparent outline-none text-sm"
                />
                <button
                  onClick={() => removeTodo(todo.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                  aria-label="削除"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 送信ボタン */}
      {todos.length > 0 && (
        <button
          onClick={submitToNotion}
          disabled={status === "loading"}
          className="w-full py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {status === "loading"
            ? "送信中…"
            : `Notion INBOX に ${todos.length} 件追加`}
        </button>
      )}

      {/* ステータスメッセージ */}
      {message && (
        <p
          className={`mt-4 text-sm text-center font-medium ${
            status === "success" ? "text-green-600" : "text-red-500"
          }`}
        >
          {status === "success" ? "✓ " : "✕ "}
          {message}
        </p>
      )}

      {todos.length === 0 && status === "idle" && (
        <p className="text-center text-gray-300 text-sm mt-8">
          まだタスクがありません
        </p>
      )}
    </main>
  );
}
