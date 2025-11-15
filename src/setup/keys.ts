import fs from "fs";
import path from "path";
import readline from "readline";

/**
 * Interactive CLI to set up API keys
 */
export async function setupKeys(): Promise<void> {
  console.log("\n🔑 Arela API Key Setup\n");

  const envPath = path.join(process.cwd(), ".env");
  const envExamplePath = path.join(process.cwd(), ".env.example");

  // Create .env from example if it doesn't exist
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log("✅ Created .env file from .env.example\n");
    } else {
      // Create minimal .env
      fs.writeFileSync(
        envPath,
        "# Arela Configuration\n\nOPENAI_API_KEY=\nANTHROPIC_API_KEY=\n"
      );
      console.log("✅ Created .env file\n");
    }
  }

  // Read current .env
  let envContent = fs.readFileSync(envPath, "utf-8");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  try {
    // OpenAI Key
    console.log("📊 OpenAI API Key (for fast query classification)");
    console.log("   Get yours at: https://platform.openai.com/api-keys");
    console.log("   Cost: ~$0.0001 per query (1 cent per 100 queries)");
    console.log("   Speed: ~200ms (vs 1.5s with Ollama)\n");

    const currentOpenAI = process.env.OPENAI_API_KEY;
    if (currentOpenAI) {
      console.log(`   Current: ${currentOpenAI.substring(0, 10)}...${currentOpenAI.slice(-4)}`);
    }

    const openaiKey = await question(
      "   Enter OpenAI API key (or press Enter to skip): "
    );

    if (openaiKey.trim()) {
      // Validate format
      if (!openaiKey.startsWith("sk-")) {
        console.log("   ⚠️  Warning: OpenAI keys usually start with 'sk-'");
      }

      // Update .env
      if (envContent.includes("OPENAI_API_KEY=")) {
        envContent = envContent.replace(
          /OPENAI_API_KEY=.*/,
          `OPENAI_API_KEY=${openaiKey.trim()}`
        );
      } else {
        envContent += `\nOPENAI_API_KEY=${openaiKey.trim()}\n`;
      }

      console.log("   ✅ OpenAI key saved\n");
    } else {
      console.log("   ⏭️  Skipped (will use Ollama for classification)\n");
    }

    // Anthropic Key (optional)
    console.log("🤖 Anthropic API Key (optional, for future features)");
    console.log("   Get yours at: https://console.anthropic.com/\n");

    const currentAnthropic = process.env.ANTHROPIC_API_KEY;
    if (currentAnthropic) {
      console.log(`   Current: ${currentAnthropic.substring(0, 10)}...${currentAnthropic.slice(-4)}`);
    }

    const anthropicKey = await question(
      "   Enter Anthropic API key (or press Enter to skip): "
    );

    if (anthropicKey.trim()) {
      // Update .env
      if (envContent.includes("ANTHROPIC_API_KEY=")) {
        envContent = envContent.replace(
          /ANTHROPIC_API_KEY=.*/,
          `ANTHROPIC_API_KEY=${anthropicKey.trim()}`
        );
      } else {
        envContent += `\nANTHROPIC_API_KEY=${anthropicKey.trim()}\n`;
      }

      console.log("   ✅ Anthropic key saved\n");
    } else {
      console.log("   ⏭️  Skipped\n");
    }

    // Save .env
    fs.writeFileSync(envPath, envContent);

    console.log("✅ Configuration saved to .env");
    console.log("\n💡 Next steps:");
    console.log("   1. Restart your terminal or run: source .env");
    console.log("   2. Test classification: node test-meta-rag.mjs");
    console.log("   3. Or run: npm run arela -- route \"your query\"\n");
  } finally {
    rl.close();
  }
}
