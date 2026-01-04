
export interface TestGeneratorConfig {
    framework: "playwright" | "cucumber";
    outputDir: string;
}

export interface GeneratedTest {
    featureContent: string;
    stepsContent: string;
    featurePath: string;
    stepsPath: string;
}

export interface TestResult {
    success: boolean;
    output: string;
    durationMs: number;
}
