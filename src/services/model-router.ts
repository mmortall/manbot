/**
 * Model Router: maps abstract complexity levels to Ollama model names.
 * Per _docs/TECH.md: small -> llama3:8b, medium -> mistral, large -> mixtral.
 */

export type ComplexityLevel = "small" | "medium" | "large";

export interface ModelRouterConfig {
  small: string;
  medium: string;
  large: string;
}

const DEFAULT_CONFIG: ModelRouterConfig = {
  small: "llama3:8b",
  medium: "mistral",
  large: "mixtral",
};

export class ModelRouter {
  private readonly config: ModelRouterConfig;

  constructor(config?: Partial<ModelRouterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Return the Ollama model name for the given complexity level.
   */
  getModel(complexity: ComplexityLevel): string {
    return this.config[complexity];
  }

  getConfig(): ModelRouterConfig {
    return { ...this.config };
  }
}
