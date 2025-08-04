import { evaluate } from 'mathjs';
import { Plugin, PluginResult } from '@/types/plugins';

export interface MathResult {
  expression: string;
  result: number;
  timestamp: string;
}

export class MathPlugin implements Plugin {
  public readonly name = 'math';
  public readonly description = 'Evaluate mathematical expressions safely';
  detectIntent(message: string): boolean {
    const mathMatch = message.match(/(\d+(?:\s*[\+\-\*\/]\s*\d+)+)/);
    return !!mathMatch;
  }

  async execute(message: string): Promise<PluginResult> {
    const mathMatch = message.match(/(\d+(?:\s*[\+\-\*\/]\s*\d+)+)/);
    if (!mathMatch) {
      return {
        name: this.name,
        success: false,
        error: 'No mathematical expression found in message',
      };
    }

    const expression = mathMatch[1];
    console.log(`🧮 Math plugin detected for expression: ${expression}`);

    try {
      const mathResult = await this.evaluate(expression || '');
      return {
        name: this.name,
        success: true,
        data: mathResult,
      };
    } catch (error) {
      return {
        name: this.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async evaluate(expression: string): Promise<MathResult> {
    try {
      console.log(`🧮 Evaluating math expression: ${expression}`);

      // Clean the expression
      const cleanExpression = expression.replace(/\s+/g, '');

      // Validate expression for safety
      if (!this.isSafeExpression(cleanExpression)) {
        throw new Error('Expression contains unsafe operations');
      }

      // Evaluate using mathjs
      const result = evaluate(cleanExpression);

      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Invalid result');
      }

      return {
        expression: cleanExpression,
        result: result,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error(`❌ Math evaluation failed for ${expression}:`, error);
      throw new Error(`Failed to evaluate: ${expression}`);
    }
  }

  private isSafeExpression(expression: string): boolean {
    // Only allow basic arithmetic operations
    const safePattern = /^[\d\+\-\*\/\(\)\.\s]+$/;

    if (!safePattern.test(expression)) {
      return false;
    }

    // Prevent division by zero
    if (expression.includes('/0')) {
      return false;
    }

    // Prevent excessive nesting
    const openParens = (expression.match(/\(/g) || []).length;
    const closeParens = (expression.match(/\)/g) || []).length;

    if (openParens !== closeParens) {
      return false;
    }

    return true;
  }
}