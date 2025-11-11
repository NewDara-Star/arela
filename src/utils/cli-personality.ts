import pc from "picocolors";

export interface PersonalityConfig {
  mode: "professional" | "fun" | "bold";
  emojis: boolean;
  humor: boolean;
}

export const personalities: Record<string, PersonalityConfig> = {
  professional: {
    mode: "professional",
    emojis: false,
    humor: false,
  },
  fun: {
    mode: "fun",
    emojis: true,
    humor: true,
  },
  bold: {
    mode: "bold",
    emojis: true,
    humor: true,
  },
};

export function getMessage(config: PersonalityConfig, key: string, fallback?: string): string {
  const messages: Record<string, Record<string, string>> = {
    professional: {
      init: "Initializing Arela...",
      init_success: "Arela initialized successfully!",
      preset_info: "Using preset: {{preset}}",
      created: "Created:",
      next_steps: "Next steps:",
    },
    fun: {
      init: "🎯 Arela v3.1.0 - Your AI CTO is here to help!",
      init_success: "✨ Boom! Your AI CTO is ready",
      preset_info: "🚀 {{preset}} mode activated!",
      created: "📦 Unpacked:",
      next_steps: "📚 What's next:",
    },
    bold: {
      init: "🔥 Arela v3.1.0 - No bullshit, just results",
      init_success: "✅ Done. Now go build something useful",
      preset_info: "{{preset}} - Because you need this",
      created: "Files created (don't ignore them):",
      next_steps: "Stop procrastinating and:",
    },
  };

  return messages[config.mode]?.[key] || fallback || key;
}

export function formatList(config: PersonalityConfig, items: string[]): string {
  return items.map(item => {
    if (config.mode === "professional") {
      return `  - ${item}`;
    } else if (config.mode === "fun") {
      return `  - ${item}`;
    } else {
      return `  - ${item}`;
    }
  }).join("\n");
}

export function getPresetDescription(config: PersonalityConfig, preset: string): string {
  const descriptions: Record<string, Record<string, string>> = {
    professional: {
      startup: "Startup (11 rules) - Pragmatic & fast-moving",
      enterprise: "Enterprise (23 rules) - Comprehensive quality",
      solo: "Solo (9 rules) - Lightweight essentials",
      all: "All Rules (29 rules) - Complete rule set",
    },
    fun: {
      startup: "🚀 Startup (11 rules) - Move fast, break things",
      enterprise: "🏢 Enterprise (23 rules) - Quality & compliance",
      solo: "🦸 Solo Dev (9 rules) - Just the essentials",
      all: "🌯 The Whole Enchilada (29 rules) - Give me everything!",
    },
    bold: {
      startup: "Startup (11 rules) - For when you need to ship yesterday",
      enterprise: "Enterprise (23 rules) - Because someone needs to care about quality",
      solo: "Solo (9 rules) - You're alone, don't overcomplicate it",
      all: "All Rules (29 rules) - Stop asking questions and take everything",
    },
  };

  return descriptions[config.mode]?.[preset] || preset;
}
