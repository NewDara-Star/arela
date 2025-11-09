"use client";

import { useState } from "react";

export default function Home() {
  const [repo, setRepo] = useState("");
  const [agent, setAgent] = useState<"cursor" | "windsurf" | "claude" | "generic">("cursor");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  const handleInstall = async () => {
    if (!repo) {
      setResult({ error: "Please enter a repository" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // In production, this would use GitHub OAuth
      // For now, user needs to provide token
      const token = prompt("Enter your GitHub token (repo scope):");
      if (!token) {
        setResult({ error: "Token required" });
        setLoading(false);
        return;
      }

      const response = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, agent, token }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true });
      } else {
        setResult({ error: data.error || "Installation failed" });
      }
    } catch (error: any) {
      setResult({ error: error.message || "Network error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold mb-4">
              🛡️ <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Arela</span>
            </h1>
            <p className="text-xl text-slate-300">
              Bootstrap engineering discipline in 60 seconds
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl">
            <div className="space-y-6">
              {/* Repository Input */}
              <div>
                <label htmlFor="repo" className="block text-sm font-medium text-slate-300 mb-2">
                  GitHub Repository
                </label>
                <input
                  id="repo"
                  type="text"
                  placeholder="owner/repo"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition"
                />
              </div>

              {/* Agent Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Agent Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["cursor", "windsurf", "claude", "generic"] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => setAgent(a)}
                      className={`px-4 py-3 rounded-lg font-medium transition ${
                        agent === a
                          ? "bg-cyan-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Install Button */}
              <button
                onClick={handleInstall}
                disabled={loading || !repo}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed rounded-lg font-semibold text-lg transition shadow-lg"
              >
                {loading ? "Installing..." : "Install Arela"}
              </button>

              {/* Result */}
              {result && (
                <div
                  className={`p-4 rounded-lg ${
                    result.success
                      ? "bg-green-500/10 border border-green-500/50 text-green-400"
                      : "bg-red-500/10 border border-red-500/50 text-red-400"
                  }`}
                >
                  {result.success ? (
                    <div>
                      <p className="font-semibold mb-2">✅ PR Created!</p>
                      <p className="text-sm">Check your repository for the pull request.</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold mb-2">❌ Error</p>
                      <p className="text-sm">{result.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-2">📋</div>
              <h3 className="font-semibold mb-1">Rules</h3>
              <p className="text-sm text-slate-400">13 CTO-level standards</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🤖</div>
              <h3 className="font-semibold mb-1">CI/CD</h3>
              <p className="text-sm text-slate-400">Auto-enforced in PRs</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="font-semibold mb-1">Zero Config</h3>
              <p className="text-sm text-slate-400">Works out of the box</p>
            </div>
          </div>

          {/* CLI Alternative */}
          <div className="mt-12 p-6 bg-slate-800/30 border border-slate-700 rounded-xl">
            <p className="text-sm text-slate-400 mb-3">Prefer the terminal?</p>
            <code className="block bg-slate-900 px-4 py-3 rounded-lg text-cyan-400 font-mono text-sm">
              npx @newdara/arela-setup
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
