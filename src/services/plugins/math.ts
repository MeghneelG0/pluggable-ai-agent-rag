import { evaluate } from 'mathjs';

export interface MathResult {
  expression: string;
  result: number;
  timestamp: string;
}

export class MathPlugin {
  async evaluate(expression: string): Promise<MathResult> {
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