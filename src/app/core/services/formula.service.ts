import { Injectable } from '@angular/core';
import { FormulaParam } from '../models/formula-calculator.model';

@Injectable({
  providedIn: 'root'
})
export class FormulaService {

  /**
   * Convert ID-based formula to display formula using parameter names
   * @param idFormula Formula with ID_1, ID_2 format
   * @param availableParams List of available parameters
   * @returns Display formula with parameter names
   */
  convertIdToDisplayFormula(idFormula: string, availableParams: FormulaParam[]): string {
    if (!idFormula) return '';
    
    return idFormula.replace(/ID_(\d+)/g, (match, idStr) => {
      const id = parseInt(idStr);
      const param = availableParams.find(p => p.id === id);
      return param ? param.code : `ID_${id}`; // Use code instead of ten
    });
  }

  /**
   * Convert display formula to ID-based formula
   * @param displayFormula Formula with parameter names
   * @param availableParams List of available parameters
   * @returns ID-based formula
   */
  convertDisplayToIdFormula(displayFormula: string, availableParams: FormulaParam[]): string {
    if (!displayFormula) return '';
    
    let result = displayFormula;
    // Sort by name length (longest first) to avoid partial matches
    const sortedParams = [...availableParams].sort((a, b) => b.code.length - a.code.length);
    
    for (const param of sortedParams) {
      const regex = new RegExp(this.escapeRegExp(param.code), 'g');
      result = result.replace(regex, `ID_${param.id}`);
    }
    
    return result;
  }

  /**
   * Check if formula is self-referencing
   * @param idFormula ID-based formula
   * @param paramId Parameter ID to check
   * @returns true if self-referencing
   */
  isSelfReferencing(idFormula: string, paramId: number): boolean {
    if (!idFormula) return false;
    
    const selfRefPattern = new RegExp(`ID_${paramId}(?!\\d)`, 'g');
    return selfRefPattern.test(idFormula);
  }

  /**
   * Evaluate formula with given parameter values
   * @param idFormula ID-based formula
   * @param paramValues Map of parameter ID to value
   * @returns Calculated result
   */
  evaluateFormula(idFormula: string, paramValues: Map<number, number>): number {
    if (!idFormula) return 0;
    
    try {
      // Replace ID_1, ID_2 with actual values
      let expression = idFormula.replace(/ID_(\d+)/g, (match, idStr) => {
        const id = parseInt(idStr);
        const value = paramValues.get(id) || 0;
        return value.toString();
      });
      
      // Handle division by zero
      if (expression.includes('/0')) {
        return 0;
      }
      
      // Evaluate the expression safely
      // eslint-disable-next-line no-new-func
      const fn = new Function(`return (${expression});`);
      const result = Number(fn());
      return isNaN(result) ? 0 : result;
    } catch (error) {
      console.error('Error evaluating formula:', error);
      return 0;
    }
  }

  /**
   * Validate formula syntax
   * @param formula Formula to validate
   * @returns true if valid
   */
  validateFormula(formula: string): boolean {
    if (!formula.trim()) return false;
    
    // Check balanced parentheses
    const openBraces = (formula.match(/\(/g) || []).length;
    const closeBraces = (formula.match(/\)/g) || []).length;
    if (openBraces !== closeBraces) return false;
    
    // Check for valid characters
    const validPattern = /^[0-9+\-*/.()ID_\s;:]+$/;
    if (!validPattern.test(formula)) return false;
    
    return true;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
