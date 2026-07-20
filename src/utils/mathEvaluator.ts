import { AngleUnit } from '../types';

/**
 * Safe math evaluator for expressions.
 * Implements token-based parsing to handle parentheses, operator precedence, 
 * trigonometric functions (supporting DEG/RAD), and standard scientific constants.
 */

// Helper to calculate factorial
export function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= Math.min(n, 170); i++) {
    result *= i;
  }
  return result;
}

// Format double numbers cleanly to avoid floating point issues (like 0.1 + 0.2 = 0.30000000000000004)
export function formatResult(num: number): string {
  if (isNaN(num)) return 'Hata';
  if (!isFinite(num)) {
    if (num > 0) return '∞';
    return '-∞';
  }
  
  // Convert scientific notation if number is extremely large or small
  const str = num.toString();
  if (str.includes('e')) {
    const parts = str.split('e');
    const base = parseFloat(parts[0]).toFixed(6).replace(/\.?0+$/, '');
    return `${base} × 10^{${parts[1]}}`;
  }

  // Handle standard decimal precision limit
  const fixed = parseFloat(num.toFixed(10));
  return fixed.toString();
}

/**
 * Tokenizes the expression and computes the result safely.
 */
export function evaluateExpression(expression: string, angleUnit: AngleUnit): string {
  try {
    if (!expression || expression.trim() === '') return '0';

    // 1. Sanitize expression
    let parsedExpr = expression
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/π/g, Math.PI.toString())
      .replace(/e/g, Math.E.toString());

    // Auto-close open parentheses if they exist
    const openParens = (parsedExpr.match(/\(/g) || []).length;
    const closeParens = (parsedExpr.match(/\)/g) || []).length;
    if (openParens > closeParens) {
      parsedExpr += ')'.repeat(openParens - closeParens);
    }

    // 2. Evaluate functions using recursive parsing
    const result = parseAndEvaluate(parsedExpr, angleUnit);
    if (isNaN(result)) {
      return 'Hata';
    }
    return formatResult(result);
  } catch (error) {
    console.error('Evaluation error:', error);
    return 'Hata';
  }
}

/**
 * Safe expression parser implementing operator precedence and parenthesis evaluation.
 */
function parseAndEvaluate(expr: string, angleUnit: AngleUnit): number {
  // Strip outer matching parentheses if the entire expression is wrapped
  let cleanExpr = expr.trim();
  
  // Evaluate parentheses first
  while (cleanExpr.includes('(')) {
    // Find the innermost parenthesis block
    let openIdx = -1;
    let closeIdx = -1;
    
    // Find matching pair
    for (let i = 0; i < cleanExpr.length; i++) {
      if (cleanExpr[i] === '(') {
        openIdx = i;
      } else if (cleanExpr[i] === ')') {
        if (openIdx !== -1) {
          closeIdx = i;
          break;
        }
      }
    }
    
    if (openIdx !== -1 && closeIdx !== -1) {
      const inner = cleanExpr.substring(openIdx + 1, closeIdx);
      
      // Check if there's a function identifier right before this open parenthesis
      let funcName = '';
      let funcStartIdx = openIdx;
      
      const functions = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'sqrt', '√'];
      for (const f of functions) {
        const len = f.length;
        if (openIdx >= len && cleanExpr.substring(openIdx - len, openIdx) === f) {
          funcName = f;
          funcStartIdx = openIdx - len;
          break;
        }
      }
      
      const innerVal = parseAndEvaluate(inner, angleUnit);
      let replacedVal = innerVal;
      
      if (funcName !== '') {
        switch (funcName) {
          case 'sin':
            const radSin = angleUnit === 'deg' ? (innerVal * Math.PI) / 180 : innerVal;
            // Handle precision limits for 180 degrees etc.
            replacedVal = Math.abs(radSin % Math.PI) < 1e-15 && Math.abs(radSin) > 1e-5 ? 0 : Math.sin(radSin);
            break;
          case 'cos':
            const radCos = angleUnit === 'deg' ? (innerVal * Math.PI) / 180 : innerVal;
            // Handle precision limits for 90 degrees etc.
            const cosVal = Math.abs((radCos - Math.PI / 2) % Math.PI) < 1e-15 ? 0 : Math.cos(radCos);
            replacedVal = cosVal;
            break;
          case 'tan':
            const radTan = angleUnit === 'deg' ? (innerVal * Math.PI) / 180 : innerVal;
            if (Math.abs((radTan - Math.PI / 2) % Math.PI) < 1e-15) {
              return NaN; // Tan(90) is undefined
            }
            replacedVal = Math.tan(radTan);
            break;
          case 'asin':
            replacedVal = angleUnit === 'deg' ? (Math.asin(innerVal) * 180) / Math.PI : Math.asin(innerVal);
            break;
          case 'acos':
            replacedVal = angleUnit === 'deg' ? (Math.acos(innerVal) * 180) / Math.PI : Math.acos(innerVal);
            break;
          case 'atan':
            replacedVal = angleUnit === 'deg' ? (Math.atan(innerVal) * 180) / Math.PI : Math.atan(innerVal);
            break;
          case 'log':
            replacedVal = Math.log10(innerVal);
            break;
          case 'ln':
            replacedVal = Math.log(innerVal);
            break;
          case 'sqrt':
          case '√':
            replacedVal = Math.sqrt(innerVal);
            break;
        }
        cleanExpr = cleanExpr.substring(0, funcStartIdx) + replacedVal.toString() + cleanExpr.substring(closeIdx + 1);
      } else {
        cleanExpr = cleanExpr.substring(0, openIdx) + replacedVal.toString() + cleanExpr.substring(closeIdx + 1);
      }
    } else {
      break;
    }
  }

  // Handle factorials in the expressions: e.g., 5!
  cleanExpr = evaluateFactorials(cleanExpr);

  // Now evaluate basic expression without parentheses (tokens)
  return evaluateSimpleExpression(cleanExpr);
}

/**
 * Handles postfix factorials like "5!" or "10!".
 */
function evaluateFactorials(expr: string): string {
  let result = expr;
  // Match a positive integer followed by a !
  const factorialRegex = /(\d+)!/g;
  let match;
  
  while ((match = factorialRegex.exec(result)) !== null) {
    const num = parseInt(match[1]);
    const factVal = factorial(num);
    result = result.replace(match[0], factVal.toString());
    // reset regex index because length changed
    factorialRegex.lastIndex = 0;
  }
  return result;
}

/**
 * Evaluates binary expressions with operator precedence rules.
 */
function evaluateSimpleExpression(expr: string): number {
  let temp = expr.trim();
  if (temp === '') return 0;

  // Split expression by terms for '+' and '-' while respecting scientific notation e.g. 1e+5 or 1e-5
  // Also note negative numbers at the beginning
  const terms: number[] = [];
  const operators: string[] = [];
  
  let currentToken = '';
  for (let i = 0; i < temp.length; i++) {
    const char = temp[i];
    
    // Support negative numbers or signs at start or after an operator
    const isSign = char === '+' || char === '-';
    const isFirstOrAfterOperator = i === 0 || ['*', '/', '^', '+', '-'].includes(temp[i - 1]);
    const isSciNotation = (char === '+' || char === '-') && i > 0 && temp[i - 1].toLowerCase() === 'e';

    if (isSign && !isFirstOrAfterOperator && !isSciNotation) {
      // It's a real boundary operator
      terms.push(evaluateTerm(currentToken));
      operators.push(char);
      currentToken = '';
    } else {
      currentToken += char;
    }
  }
  terms.push(evaluateTerm(currentToken));

  // Perform plus and minus operations left-to-right
  let total = terms[0];
  for (let i = 0; i < operators.length; i++) {
    const op = operators[i];
    const nextVal = terms[i + 1];
    if (op === '+') {
      total += nextVal;
    } else if (op === '-') {
      total -= nextVal;
    }
  }
  
  return total;
}

/**
 * Evaluates high-precedence terms (Multiplication, Division, Modulo, Exponentiation).
 */
function evaluateTerm(termStr: string): number {
  let cleanTerm = termStr.trim();
  if (cleanTerm === '') return 0;

  // Handle leading minus if present
  let multiplier = 1;
  if (cleanTerm.startsWith('-')) {
    // Check if it's just a single minus or multiple
    let minusCount = 0;
    while (cleanTerm.startsWith('-')) {
      minusCount++;
      cleanTerm = cleanTerm.substring(1).trim();
    }
    if (minusCount % 2 !== 0) multiplier = -1;
  }
  
  if (cleanTerm.startsWith('+')) {
    cleanTerm = cleanTerm.substring(1).trim();
  }

  // Parse multiplication, division, modulo, and powers
  const tokens: string[] = [];
  let current = '';
  
  for (let i = 0; i < cleanTerm.length; i++) {
    const char = cleanTerm[i];
    if (['*', '/', '^', '%'].includes(char)) {
      tokens.push(current.trim());
      tokens.push(char);
      current = '';
    } else {
      current += char;
    }
  }
  tokens.push(current.trim());

  // Evaluate powers '^' first (right to left, or left to right, standard left to right)
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === '^') {
      const base = parseFloat(tokens[i - 1]);
      const exponent = parseFloat(tokens[i + 1]);
      const result = Math.pow(base, exponent);
      
      tokens.splice(i - 1, 3, result.toString());
      i--; // adjust pointer since elements were removed
    }
  }

  // Evaluate '*', '/' and '%'
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === '*' || token === '/' || token === '%') {
      const left = parseFloat(tokens[i - 1]);
      const right = parseFloat(tokens[i + 1]);
      let res = 0;
      
      if (token === '*') res = left * right;
      else if (token === '/') {
        if (right === 0) return NaN; // Division by zero
        res = left / right;
      }
      else if (token === '%') res = left % right;
      
      tokens.splice(i - 1, 3, res.toString());
      i--; // adjust pointer
    }
  }

  return parseFloat(tokens[0]) * multiplier;
}
