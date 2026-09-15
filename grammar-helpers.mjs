/**
 * @file C grammar for tree-sitter
 * @author Max Brunsfeld <maxbrunsfeld@gmail.com>
 * @author Amaan Qureshi <amaanq12@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl.d.ts" />
// @ts-check

export const PREC = {
  PAREN_DECLARATOR: -10,
  ASSIGNMENT: -2,
  CONDITIONAL: -1,
  DEFAULT: 0,
  LOGICAL_OR: 1,
  LOGICAL_AND: 2,
  INCLUSIVE_OR: 3,
  EXCLUSIVE_OR: 4,
  BITWISE_AND: 5,
  EQUAL: 6,
  RELATIONAL: 7,
  OFFSETOF: 8,
  SHIFT: 9,
  ADD: 10,
  MULTIPLY: 11,
  CAST: 12,
  SIZEOF: 13,
  UNARY: 14,
  CALL: 15,
  FIELD: 16,
  SUBSCRIPT: 17,
};

/**
 * Build a mutually recursive preprocessor family, resolving references lazily.
 *
 * @param {string} suffix
 *
 * @param {() => RuleOrLiteral} content
 * @param {() => { _preproc_expression: RuleHandle, identifier: RuleHandle, preproc_else: RuleHandle, preproc_elif: RuleHandle, preproc_elifdef: RuleHandle }} symbols
 *
 * @param {number} precedence
 * @returns {Record<string, RuleHandle>}
 */
export function preprocIf(suffix, content, symbols, precedence = 0) {
  /**
   *
   * @param {ReturnType<typeof symbols>} refs
   *
   * @returns {ChoiceRule}
   */
  function alternativeBlock(refs) {
    return choice(
      suffix ? alias(rules['preproc_else' + suffix], refs.preproc_else) : rules.preproc_else,
      suffix ? alias(rules['preproc_elif' + suffix], refs.preproc_elif) : rules.preproc_elif,
      suffix ? alias(rules['preproc_elifdef' + suffix], refs.preproc_elifdef) : rules.preproc_elifdef,
    );
  }

  const rules = {
    ['preproc_if' + suffix]: rule(() => {
      const refs = symbols();
      return prec(precedence, seq(
        preprocessor('if'),
        field('condition', refs._preproc_expression),
        '\n',
        repeat(content()),
        field('alternative', optional(alternativeBlock(refs))),
        preprocessor('endif'),
      ));
    }),

    ['preproc_ifdef' + suffix]: rule(() => {
      const refs = symbols();
      return prec(precedence, seq(
        choice(preprocessor('ifdef'), preprocessor('ifndef')),
        field('name', refs.identifier),
        repeat(content()),
        field('alternative', optional(alternativeBlock(refs))),
        preprocessor('endif'),
      ));
    }),

    ['preproc_else' + suffix]: rule(() => {
      return prec(precedence, seq(
        preprocessor('else'),
        repeat(content()),
      ));
    }),

    ['preproc_elif' + suffix]: rule(() => {
      const refs = symbols();
      return prec(precedence, seq(
        preprocessor('elif'),
        field('condition', refs._preproc_expression),
        '\n',
        repeat(content()),
        field('alternative', optional(alternativeBlock(refs))),
      ));
    }),

    ['preproc_elifdef' + suffix]: rule(() => {
      const refs = symbols();
      return prec(precedence, seq(
        choice(preprocessor('elifdef'), preprocessor('elifndef')),
        field('name', refs.identifier),
        repeat(content()),
        field('alternative', optional(alternativeBlock(refs))),
      ));
    }),
  };
  return rules;
}

/**
 * Creates a preprocessor regex rule
 *
 * @param {RegExp | Rule | string} command
 *
 * @returns {AliasRule}
 */
export function preprocessor(command) {
  return alias(new RegExp('#[ \t]*' + command), '#' + command);
}

/**
 * Creates a rule to optionally match one or more of the rules separated by a comma
 *
 * @param {RuleOrLiteral} rule
 *
 * @returns {ChoiceRule}
 */
export function commaSep(rule) {
  return optional(commaSep1(rule));
}

/**
 * Creates a rule to match one or more of the rules separated by a comma
 *
 * @param {RuleOrLiteral} rule
 *
 * @returns {SeqRule}
 */
export function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}
