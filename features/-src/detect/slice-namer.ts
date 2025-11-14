/**
 * Generate descriptive slice names from file patterns
 */

import path from "node:path";

/**
 * Suggest a name for a slice based on its files
 */
export function suggestSliceName(files: string[]): string {
  if (files.length === 0) {
    return "feature";
  }

  // Extract directory names (first component of path)
  const dirCounts = new Map<string, number>();

  for (const file of files) {
    const parts = file.split("/");
    const dir = parts[0];

    if (dir && dir !== "." && !dir.startsWith(".")) {
      dirCounts.set(dir, (dirCounts.get(dir) || 0) + 1);
    }
  }

  // Get most common directory
  let mostCommonDir = "";
  let maxCount = 0;

  for (const [dir, count] of dirCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonDir = dir;
    }
  }

  // Try common patterns
  const commonPatterns: Record<string, string> = {
    auth: "🔐 authentication",
    user: "👤 user",
    workout: "💪 workout",
    exercise: "🏋️ exercise",
    nutrition: "🥗 nutrition",
    meal: "🍽️ meals",
    social: "👥 social",
    feed: "📰 feed",
    friend: "👫 friends",
    message: "💬 messaging",
    chat: "💬 chat",
    payment: "💳 billing",
    billing: "💰 payments",
    admin: "⚙️ admin",
    account: "🔑 account",
    settings: "⚙️ settings",
    profile: "👤 profile",
    search: "🔍 search",
    api: "🔌 api",
    service: "🔧 service",
    util: "🛠️ utilities",
    component: "🎨 components",
    layout: "📐 layout",
    theme: "🎨 theme",
    style: "💄 styling",
    test: "🧪 testing",
    spec: "📝 specs",
    config: "⚙️ config",
    env: "🔧 environment",
    db: "💾 database",
    store: "💾 storage",
    cache: "⚡ cache",
    queue: "📦 queue",
    job: "⏰ jobs",
    worker: "🔄 workers",
    hook: "🪝 hooks",
    middleware: "🔗 middleware",
    guard: "🛡️ guards",
    interceptor: "🔀 interceptors",
    directive: "📍 directives",
    filter: "🧹 filters",
    pipe: "💨 pipes",
    resolver: "🔍 resolvers",
    gateway: "🚪 gateway",
    controller: "🎮 controllers",
    handler: "📍 handlers",
    listener: "👂 listeners",
    event: "📢 events",
    command: "⌨️ commands",
    query: "❓ queries",
    mutation: "✏️ mutations",
    subscription: "📡 subscriptions",
  };

  // Check for pattern matches in file names
  const fileContent = files.join(" ").toLowerCase();
  for (const [pattern, name] of Object.entries(commonPatterns)) {
    if (fileContent.includes(pattern)) {
      return name;
    }
  }

  // Use most common directory if found
  if (mostCommonDir && mostCommonDir in commonPatterns) {
    return commonPatterns[mostCommonDir];
  }

  // Fallback to directory name
  if (mostCommonDir) {
    return formatSliceName(mostCommonDir);
  }

  return "feature";
}

/**
 * Format a slice name from raw input
 */
function formatSliceName(name: string): string {
  // Convert snake_case, kebab-case, camelCase to title case
  const formatted = name
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase
    .replace(/[-_]/g, " ") // kebab-case, snake_case
    .toLowerCase()
    .trim();

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Get emoji for a feature type
 */
export function getFeatureEmoji(sliceName: string): string {
  const emojis: Record<string, string> = {
    "🔐 authentication": "🔐",
    "👤 user": "👤",
    "💪 workout": "💪",
    "🏋️ exercise": "🏋️",
    "🥗 nutrition": "🥗",
    "🍽️ meals": "🍽️",
    "👥 social": "👥",
    "📰 feed": "📰",
    "👫 friends": "👫",
    "💬 messaging": "💬",
    "💬 chat": "💬",
    "💳 billing": "💳",
    "💰 payments": "💰",
    "⚙️ admin": "⚙️",
    "🔑 account": "🔑",
    "⚙️ settings": "⚙️",
    "👤 profile": "👤",
    "🔍 search": "🔍",
    "🔌 api": "🔌",
    "🔧 service": "🔧",
    "🛠️ utilities": "🛠️",
    "🎨 components": "🎨",
    "📐 layout": "📐",
    "🎨 theme": "🎨",
    "💄 styling": "💄",
    "🧪 testing": "🧪",
    "📝 specs": "📝",
    "⚙️ config": "⚙️",
    "🔧 environment": "🔧",
    "💾 database": "💾",
    "💾 storage": "💾",
    "⚡ cache": "⚡",
    "📦 queue": "📦",
    "⏰ jobs": "⏰",
    "🔄 workers": "🔄",
    "🪝 hooks": "🪝",
    "🔗 middleware": "🔗",
    "🛡️ guards": "🛡️",
    "🔀 interceptors": "🔀",
    "📍 directives": "📍",
    "🧹 filters": "🧹",
    "💨 pipes": "💨",
    "🔍 resolvers": "🔍",
    "🚪 gateway": "🚪",
    "🎮 controllers": "🎮",
    "📍 handlers": "📍",
    "👂 listeners": "👂",
    "📢 events": "📢",
    "⌨️ commands": "⌨️",
    "❓ queries": "❓",
    "✏️ mutations": "✏️",
    "📡 subscriptions": "📡",
  };

  return emojis[sliceName] || "✨";
}
