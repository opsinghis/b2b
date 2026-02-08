import { Injectable } from '@nestjs/common';
import {
  EdifactToken,
  EdifactTokenType,
  EdifactDelimiters,
  DEFAULT_EDIFACT_DELIMITERS,
  ParsePosition,
  EdifactParseError,
  UNASegment,
} from '../interfaces';

/**
 * EDIFACT Lexer/Tokenizer
 *
 * Responsible for tokenizing raw EDIFACT documents into tokens.
 * Handles UNA segment detection for delimiter extraction.
 * Properly handles escape sequences (release character).
 */
@Injectable()
export class EdifactLexerService {
  /**
   * Check if document starts with UNA segment
   */
  hasUNASegment(input: string): boolean {
    return input.trim().startsWith('UNA');
  }

  /**
   * Extract delimiters from UNA segment or use defaults
   *
   * UNA segment is exactly 9 characters:
   * UNA:+.? '
   *    │││││└─ Segment terminator
   *    ││││└── Reserved
   *    │││└─── Release character
   *    ││└──── Decimal notation
   *    │└───── Data element separator
   *    └────── Component data element separator
   */
  extractDelimiters(
    input: string,
  ): EdifactDelimiters & { errors: EdifactParseError[]; unaSegment?: UNASegment } {
    const errors: EdifactParseError[] = [];
    const trimmedInput = input.trim();

    // If no UNA segment, use defaults
    if (!trimmedInput.startsWith('UNA')) {
      return { ...DEFAULT_EDIFACT_DELIMITERS, errors };
    }

    // UNA must be exactly followed by 6 service characters
    if (trimmedInput.length < 9) {
      errors.push({
        code: 'UNA_TOO_SHORT',
        message:
          'UNA segment is too short - must be exactly 9 characters (UNA + 6 service characters)',
        position: { line: 1, column: 1, offset: 0 },
        severity: 'error',
      });
      return { ...DEFAULT_EDIFACT_DELIMITERS, errors };
    }

    const componentSeparator = trimmedInput[3];
    const elementSeparator = trimmedInput[4];
    const decimalNotation = trimmedInput[5];
    const releaseCharacter = trimmedInput[6];
    const reserved = trimmedInput[7];
    const segmentTerminator = trimmedInput[8];

    const unaSegment: UNASegment = {
      segmentId: 'UNA',
      componentSeparator,
      elementSeparator,
      decimalNotation,
      releaseCharacter,
      reserved,
      segmentTerminator,
    };

    return {
      componentSeparator,
      elementSeparator,
      decimalNotation,
      releaseCharacter,
      segmentTerminator,
      errors,
      unaSegment,
    };
  }

  /**
   * Tokenize EDIFACT document
   */
  tokenize(
    input: string,
    delimiters?: EdifactDelimiters,
  ): { tokens: EdifactToken[]; errors: EdifactParseError[] } {
    const tokens: EdifactToken[] = [];
    const errors: EdifactParseError[] = [];

    // Extract or use provided delimiters
    const delimResult = delimiters ? { ...delimiters, errors: [] } : this.extractDelimiters(input);

    if (delimResult.errors.length > 0) {
      return { tokens: [], errors: delimResult.errors };
    }

    const { componentSeparator, elementSeparator, releaseCharacter, segmentTerminator } =
      delimResult;

    // Handle UNA segment offset
    let startOffset = 0;
    if (this.hasUNASegment(input)) {
      startOffset = 9; // Skip UNA segment
    }

    let position: ParsePosition = { line: 1, column: startOffset + 1, offset: startOffset };
    let segmentIndex = 0;

    // Normalize line endings
    const normalized = input.substring(startOffset).replace(/\r\n/g, '\n');

    // Parse segments
    const segments = this.splitSegments(normalized, segmentTerminator, releaseCharacter);

    for (const segment of segments) {
      const trimmedSegment = segment.trim();
      if (!trimmedSegment) {
        position = this.updatePosition(position, segment + segmentTerminator);
        continue;
      }

      // Split segment into elements
      const elements = this.splitElements(trimmedSegment, elementSeparator, releaseCharacter);

      for (let elementIndex = 0; elementIndex < elements.length; elementIndex++) {
        const element = elements[elementIndex];

        if (elementIndex === 0) {
          // First element is the segment ID (max 3 characters)
          const segmentId = element.substring(0, 3);
          tokens.push({
            type: EdifactTokenType.SEGMENT_ID,
            value: segmentId,
            position: { ...position, segmentIndex, elementIndex: 0 },
          });

          // If segment ID is followed by more characters, it's part of the first element
          if (element.length > 3) {
            const firstElement = element.substring(3);
            // Split first element by component separator
            const components = this.splitComponents(
              firstElement,
              componentSeparator,
              releaseCharacter,
            );
            for (let compIndex = 0; compIndex < components.length; compIndex++) {
              tokens.push({
                type: compIndex === 0 ? EdifactTokenType.ELEMENT : EdifactTokenType.COMPONENT,
                value: this.unescape(components[compIndex], releaseCharacter),
                position: { ...position, segmentIndex, elementIndex: 1, componentIndex: compIndex },
              });
            }
          }
        } else {
          // Regular element - may contain components
          const components = this.splitComponents(element, componentSeparator, releaseCharacter);

          for (let compIndex = 0; compIndex < components.length; compIndex++) {
            tokens.push({
              type: compIndex === 0 ? EdifactTokenType.ELEMENT : EdifactTokenType.COMPONENT,
              value: this.unescape(components[compIndex], releaseCharacter),
              position: { ...position, segmentIndex, elementIndex, componentIndex: compIndex },
            });
          }
        }
      }

      // Add segment terminator token
      tokens.push({
        type: EdifactTokenType.SEGMENT_TERMINATOR,
        value: segmentTerminator,
        position: { ...position, segmentIndex },
      });

      position = this.updatePosition(position, trimmedSegment + segmentTerminator);
      segmentIndex++;
    }

    // Add EOF token
    tokens.push({
      type: EdifactTokenType.EOF,
      value: '',
      position,
    });

    return { tokens, errors };
  }

  /**
   * Split input by segment terminator, handling release character escapes
   */
  private splitSegments(
    input: string,
    segmentTerminator: string,
    releaseCharacter: string,
  ): string[] {
    const segments: string[] = [];
    let current = '';
    let i = 0;

    while (i < input.length) {
      const char = input[i];

      // Check for release character
      if (char === releaseCharacter && i + 1 < input.length) {
        const nextChar = input[i + 1];
        // If next char is segment terminator or release char, it's escaped
        if (nextChar === segmentTerminator || nextChar === releaseCharacter) {
          current += char + nextChar;
          i += 2;
          continue;
        }
      }

      // Check for segment terminator
      if (char === segmentTerminator) {
        if (current.trim()) {
          segments.push(current);
        }
        current = '';
        i++;
        continue;
      }

      current += char;
      i++;
    }

    // Add last segment if not empty
    if (current.trim()) {
      segments.push(current);
    }

    return segments;
  }

  /**
   * Split segment by element separator, handling release character escapes
   */
  private splitElements(
    segment: string,
    elementSeparator: string,
    releaseCharacter: string,
  ): string[] {
    const elements: string[] = [];
    let current = '';
    let i = 0;

    while (i < segment.length) {
      const char = segment[i];

      // Check for release character
      if (char === releaseCharacter && i + 1 < segment.length) {
        const nextChar = segment[i + 1];
        // If next char is a delimiter, it's escaped
        current += char + nextChar;
        i += 2;
        continue;
      }

      // Check for element separator
      if (char === elementSeparator) {
        elements.push(current);
        current = '';
        i++;
        continue;
      }

      current += char;
      i++;
    }

    // Add last element
    elements.push(current);

    return elements;
  }

  /**
   * Split element by component separator, handling release character escapes
   */
  private splitComponents(
    element: string,
    componentSeparator: string,
    releaseCharacter: string,
  ): string[] {
    const components: string[] = [];
    let current = '';
    let i = 0;

    while (i < element.length) {
      const char = element[i];

      // Check for release character
      if (char === releaseCharacter && i + 1 < element.length) {
        const nextChar = element[i + 1];
        // If next char is a delimiter, it's escaped
        current += char + nextChar;
        i += 2;
        continue;
      }

      // Check for component separator
      if (char === componentSeparator) {
        components.push(current);
        current = '';
        i++;
        continue;
      }

      current += char;
      i++;
    }

    // Add last component
    components.push(current);

    return components;
  }

  /**
   * Unescape value (remove release character before special chars)
   */
  private unescape(value: string, releaseCharacter: string): string {
    if (!value) return value;

    let result = '';
    let i = 0;

    while (i < value.length) {
      const char = value[i];

      if (char === releaseCharacter && i + 1 < value.length) {
        // Skip the release character, add the next character
        result += value[i + 1];
        i += 2;
      } else {
        result += char;
        i++;
      }
    }

    return result;
  }

  /**
   * Escape value for EDIFACT output
   */
  escape(value: string, delimiters: EdifactDelimiters): string {
    if (!value) return value;

    const specialChars = [
      delimiters.componentSeparator,
      delimiters.elementSeparator,
      delimiters.segmentTerminator,
      delimiters.releaseCharacter,
    ];

    let result = '';
    for (const char of value) {
      if (specialChars.includes(char)) {
        result += delimiters.releaseCharacter + char;
      } else {
        result += char;
      }
    }

    return result;
  }

  /**
   * Update position after processing text
   */
  private updatePosition(position: ParsePosition, text: string): ParsePosition {
    let { line, column, offset } = position;

    for (const char of text) {
      offset++;
      if (char === '\n') {
        line++;
        column = 1;
      } else {
        column++;
      }
    }

    return { line, column, offset };
  }

  /**
   * Get segment content from tokens
   */
  getSegmentFromTokens(
    tokens: EdifactToken[],
    startIndex: number,
    delimiters: EdifactDelimiters,
  ): { segment: string; nextIndex: number } {
    let segment = '';
    let i = startIndex;

    while (i < tokens.length) {
      const token = tokens[i];

      if (token.type === EdifactTokenType.SEGMENT_TERMINATOR) {
        i++;
        break;
      }

      if (token.type === EdifactTokenType.EOF) {
        break;
      }

      if (token.type === EdifactTokenType.SEGMENT_ID) {
        segment = token.value;
      } else if (token.type === EdifactTokenType.ELEMENT) {
        segment += delimiters.elementSeparator + this.escape(token.value, delimiters);
      } else if (token.type === EdifactTokenType.COMPONENT) {
        segment += delimiters.componentSeparator + this.escape(token.value, delimiters);
      }

      i++;
    }

    return { segment, nextIndex: i };
  }
}
