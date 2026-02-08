import { Injectable } from '@nestjs/common';
import {
  X12Token,
  X12TokenType,
  X12Delimiters,
  DEFAULT_X12_DELIMITERS,
  ParsePosition,
  X12ParseError,
} from '../interfaces';

/**
 * X12 Lexer/Tokenizer
 *
 * Responsible for tokenizing raw X12 EDI documents into tokens.
 * Handles ISA segment detection for delimiter extraction.
 */
@Injectable()
export class X12LexerService {
  /**
   * Extract delimiters from ISA segment
   * ISA segment has fixed positions for delimiter detection:
   * - Position 3: Element separator
   * - Position 104 (or 105): Subelement separator
   * - Position 106 (char after IEA16): Segment terminator
   */
  extractDelimiters(input: string): X12Delimiters & { errors: X12ParseError[] } {
    const errors: X12ParseError[] = [];

    // ISA segment must be at least 106 characters
    if (input.length < 106) {
      errors.push({
        code: 'ISA_TOO_SHORT',
        message: 'ISA segment is too short to extract delimiters',
        position: { line: 1, column: 1, offset: 0 },
        severity: 'error',
      });
      return { ...DEFAULT_X12_DELIMITERS, errors };
    }

    // First 3 characters must be "ISA"
    if (!input.startsWith('ISA')) {
      errors.push({
        code: 'INVALID_ISA',
        message: `Expected ISA segment at start of document, found: ${input.substring(0, 3)}`,
        position: { line: 1, column: 1, offset: 0 },
        severity: 'error',
      });
      return { ...DEFAULT_X12_DELIMITERS, errors };
    }

    // Element separator is at position 3 (index 3)
    const elementSeparator = input[3];

    // Split ISA by element separator to find the subelement separator (ISA16)
    // ISA has 16 elements
    const isaElements = input.split(elementSeparator);
    if (isaElements.length < 17) {
      errors.push({
        code: 'ISA_ELEMENT_COUNT',
        message: `ISA segment should have 16 elements, found fewer`,
        position: { line: 1, column: 1, offset: 0 },
        severity: 'error',
      });
      return { ...DEFAULT_X12_DELIMITERS, errors };
    }

    // ISA16 is the component element separator (subelement separator)
    // ISA16 is at index 16 (ISA + 16 elements, but ISA[0] = "ISA")
    // So elements are: [0]=ISA, [1]=ISA01, [2]=ISA02, ..., [16]=ISA16
    const isa16 = isaElements[16];

    // ISA16 should be 1 character followed by segment terminator
    const subelementSeparator = isa16[0];
    const segmentTerminator = isa16.length > 1 ? isa16[1] : '~';

    // ISA11 (repetition separator) - only valid in 5010
    // In 4010, ISA11 is a standards identifier (usually 'U')
    const isa11 = isaElements[11];

    // For 5010, ISA11 is the repetition separator
    // For 4010, use default '^'
    const repetitionSeparator = isa11 && isa11.length === 1 && isa11 !== 'U' ? isa11 : '^';

    return {
      elementSeparator,
      subelementSeparator,
      repetitionSeparator,
      segmentTerminator,
      errors,
    };
  }

  /**
   * Tokenize X12 document
   */
  tokenize(
    input: string,
    delimiters?: X12Delimiters,
  ): { tokens: X12Token[]; errors: X12ParseError[] } {
    const tokens: X12Token[] = [];
    const errors: X12ParseError[] = [];

    // Extract or use provided delimiters
    const delimResult = delimiters ? { ...delimiters, errors: [] } : this.extractDelimiters(input);

    if (delimResult.errors.length > 0) {
      return { tokens: [], errors: delimResult.errors };
    }

    const { elementSeparator, subelementSeparator, repetitionSeparator, segmentTerminator } =
      delimResult;

    let position: ParsePosition = { line: 1, column: 1, offset: 0 };
    let segmentIndex = 0;

    // Split by segment terminator
    const segments = this.splitSegments(input, segmentTerminator);

    for (const segment of segments) {
      const trimmedSegment = segment.trim();
      if (!trimmedSegment) {
        // Update position for empty segments
        position = this.updatePosition(position, segment + segmentTerminator);
        continue;
      }

      // Split segment by element separator
      const elements = trimmedSegment.split(elementSeparator);

      for (let elementIndex = 0; elementIndex < elements.length; elementIndex++) {
        const element = elements[elementIndex];

        if (elementIndex === 0) {
          // First element is the segment ID
          tokens.push({
            type: X12TokenType.SEGMENT_ID,
            value: element,
            position: { ...position, segmentIndex, elementIndex: 0 },
          });
        } else {
          // Check for repetitions (5010)
          if (element.includes(repetitionSeparator)) {
            const repetitions = element.split(repetitionSeparator);
            for (let repIndex = 0; repIndex < repetitions.length; repIndex++) {
              const rep = repetitions[repIndex];
              // Check for subelements
              if (rep.includes(subelementSeparator)) {
                const subelements = rep.split(subelementSeparator);
                for (let subIndex = 0; subIndex < subelements.length; subIndex++) {
                  tokens.push({
                    type: subIndex === 0 ? X12TokenType.ELEMENT : X12TokenType.SUBELEMENT,
                    value: subelements[subIndex],
                    position: { ...position, segmentIndex, elementIndex },
                  });
                }
              } else {
                tokens.push({
                  type: repIndex === 0 ? X12TokenType.ELEMENT : X12TokenType.REPETITION,
                  value: rep,
                  position: { ...position, segmentIndex, elementIndex },
                });
              }
            }
          }
          // Check for subelements
          else if (element.includes(subelementSeparator)) {
            const subelements = element.split(subelementSeparator);
            for (let subIndex = 0; subIndex < subelements.length; subIndex++) {
              tokens.push({
                type: subIndex === 0 ? X12TokenType.ELEMENT : X12TokenType.SUBELEMENT,
                value: subelements[subIndex],
                position: { ...position, segmentIndex, elementIndex },
              });
            }
          } else {
            tokens.push({
              type: X12TokenType.ELEMENT,
              value: element,
              position: { ...position, segmentIndex, elementIndex },
            });
          }
        }
      }

      // Add segment terminator token
      tokens.push({
        type: X12TokenType.SEGMENT_TERMINATOR,
        value: segmentTerminator,
        position: { ...position, segmentIndex },
      });

      position = this.updatePosition(position, trimmedSegment + segmentTerminator);
      segmentIndex++;
    }

    // Add EOF token
    tokens.push({
      type: X12TokenType.EOF,
      value: '',
      position,
    });

    return { tokens, errors };
  }

  /**
   * Split input by segment terminator, handling line breaks
   */
  private splitSegments(input: string, segmentTerminator: string): string[] {
    // Remove line breaks that may follow segment terminators
    const normalized = input.replace(/\r\n/g, '\n');

    // Split by segment terminator
    return normalized.split(segmentTerminator).filter((s) => s.trim() !== '');
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
   * Get segment string from tokens
   */
  getSegmentString(
    tokens: X12Token[],
    startIndex: number,
    delimiters: X12Delimiters,
  ): { segment: string; nextIndex: number } {
    let segment = '';
    let i = startIndex;

    while (i < tokens.length) {
      const token = tokens[i];

      if (token.type === X12TokenType.SEGMENT_TERMINATOR) {
        i++;
        break;
      }

      if (token.type === X12TokenType.SEGMENT_ID) {
        segment = token.value;
      } else if (token.type === X12TokenType.ELEMENT) {
        segment += delimiters.elementSeparator + token.value;
      } else if (token.type === X12TokenType.SUBELEMENT) {
        segment += delimiters.subelementSeparator + token.value;
      } else if (token.type === X12TokenType.REPETITION) {
        segment += delimiters.repetitionSeparator + token.value;
      }

      i++;
    }

    return { segment, nextIndex: i };
  }
}
