"use client";

import { useEffect, useRef, useState } from "react";

type Todo = { id: string; text: string };
type Phase = "record" | "review" | "done";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpeechRecognition(): (new () => any) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("record");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [interim, setInterim] = useState("");
  const [recording, setRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [addedCount, setAddedCount] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

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
          if (text) setTodos((prev) => [...prev, { id: crypto.randomUUID(), text }]);
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

  function startRecording() {
    if (!getSpeechRecognition()) {
      alert("このブラウザは音声認識に対応していません（Chromeを使ってください）");
      return;
    }
    recognitionRef.current?.start();
    setRecording(true);
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    // onend で recording=false になる
  }

  function goToReview() {
    if (recording) recognitionRef.current?.stop();
    setPhase("review");
  }

  function backToRecord() {
    setPhase("record");
    setErrorMsg("");
  }

  function updateTodo(id: string, text: string) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t)));
  }

  function removeTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function addBlankTodo() {
    setTodos((prev) => [...prev, { id: crypto.randomUUID(), text: "" }]);
  }

  async function submitToNotion() {
    const validTodos = todos.filter((t) => t.text.trim());
    if (validTodos.length === 0) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/add-todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todos: validTodos.map((t) => t.text.trim()) }),
      });
      if (!res.ok) throw new Error(await res.text());
      setAddedCount(validTodos.length);
      setTodos([]);
      setPhase("done");
    } catch (e) {
      setErrorMsg("エラー: " + String(e));
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    setTodos([]);
    setPhase("record");
    setErrorMsg("");
    setAddedCount(0);
  }

  // ── 録音フェーズ ──────────────────────────────────────
  if (phase === "record") {
    return (
      <main className="max-w-lg mx-auto px-4 py-12 flex flex-col items-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">やり残しTODO</h1>
        <p className="text-sm text-gray-400 mb-10">
          話しかけると Notion の INBOX にタスクを追加します
        </p>

        <button
          onClick={recording ? stopRecording : startRecording}
          className={`w-28 h-28 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 ${
            recording
              ? "bg-red-500 hover:bg-red-600 animate-pulse"
              : "bg-white hover:bg-gray-50 border-2 border-gray-200"
          }`}
          aria-label={recording ? "録音停止" : "録音開始"}
        >
          <svg
            className={`w-11 h-11 ${recording ? "text-white" : "text-gray-500"}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm6.364 9.414a.75.75 0 0 1 1.49.172A7.5 7.5 0 0 1 12.75 18.45V21h2.25a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1 0-1.5h2.25v-2.55A7.5 7.5 0 0 1 4.146 10.586a.75.75 0 1 1 1.49-.172 6 6 0 0 0 11.728 0z" />
          </svg>
        </button>

        <p className="mt-4 text-sm font-medium text-gray-600">
          {recording ? "録音中… 話してください" : "タップして録音開始"}
        </p>

        {interim && (
          <p className="mt-2 text-sm text-gray-400 italic">{interim}…</p>
        )}

        {/* 録音中に取得済みタスクをプレビュー */}
        {todos.length > 0 && (
          <div className="mt-8 w-full">
            <p className="text-xs text-gray-400 mb-2">{todos.length}件を取得済み</p>
            <ul className="space-y-1">
              {todos.map((t) => (
                <li key={t.id} className="text-sm text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
                  {t.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {todos.length > 0 && (
          <button
            onClick={goToReview}
            className="mt-6 w-full py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-700 transition-colors"
          >
            確認・編集する ({todos.length}件) →
          </button>
        )}
      </main>
    );
  }

  // ── 確認・編集フェーズ ────────────────────────────────
  if (phase === "review") {
    return (
      <main className="max-w-lg mx-auto px-4 py-10">
        <button
          onClick={backToRecord}
          className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1"
        >
          ← 録音に戻る
        </button>

        <h2 className="text-xl font-bold text-gray-800 mb-1">確認・編集</h2>
        <p className="text-sm text-gray-400 mb-6">
          内容を確認・修正してから Notion に追加してください
        </p>

        {todos.length === 0 ? (
          <p className="text-center text-gray-300 text-sm py-8">タスクがありません</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {todos.map((todo, i) => (
              <li
                key={todo.id}
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100"
              >
                <span className="text-xs text-gray-300 w-4 shrink-0">{i + 1}</span>
                <input
                  type="text"
                  value={todo.text}
                  onChange={(e) => updateTodo(todo.id, e.target.value)}
                  placeholder="タスク内容"
                  className="flex-1 text-gray-800 bg-transparent outline-none text-sm"
                  autoFocus={todo.text === ""}
                />
                <button
                  onClick={() => removeTodo(todo.id)}
                  className="text-gray-200 hover:text-red-400 transition-colors text-lg leading-none"
                  aria-label="削除"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={addBlankTodo}
          className="w-full py-2 rounded-xl border border-dashed border-gray-200 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors mb-6"
        >
          + タスクを手動で追加
        </button>

        {errorMsg && (
          <p className="text-sm text-red-500 mb-4 text-center">{errorMsg}</p>
        )}

        <button
          onClick={submitToNotion}
          disabled={submitting || todos.filter((t) => t.text.trim()).length === 0}
          className="w-full py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-700 disabled:opacity-40 transition-colors"
        >
          {submitting
            ? "送信中…"
            : `Notion INBOX に ${todos.filter((t) => t.text.trim()).length} 件追加`}
        </button>
      </main>
    );
  }

  // ── 完了フェーズ ──────────────────────────────────────
  return (
    <main className="max-w-lg mx-auto px-4 py-20 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">追加完了</h2>
      <p className="text-sm text-gray-500 mb-8">
        {addedCount}件のタスクを Notion の INBOX に追加しました
      </p>
      <button
        onClick={resetAll}
        className="px-8 py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-700 transition-colors"
      >
        続けて追加する
      </button>
    </main>
  );
}
