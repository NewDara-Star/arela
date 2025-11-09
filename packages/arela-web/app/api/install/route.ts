import { NextRequest, NextResponse } from "next/server";
import { installArela, type AgentType } from "@/lib/github";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repo, agent, token } = body;

    if (!repo || !agent || !token) {
      return NextResponse.json(
        { error: "Missing required fields: repo, agent, token" },
        { status: 400 }
      );
    }

    const validAgents: AgentType[] = ["cursor", "windsurf", "claude", "generic"];
    if (!validAgents.includes(agent)) {
      return NextResponse.json(
        { error: `Invalid agent. Must be one of: ${validAgents.join(", ")}` },
        { status: 400 }
      );
    }

    await installArela({ repo, agent, token });

    return NextResponse.json({
      success: true,
      message: `PR created for ${repo}`,
    });
  } catch (error: any) {
    console.error("Install error:", error);
    return NextResponse.json(
      { error: error.message || "Installation failed" },
      { status: 500 }
    );
  }
}
