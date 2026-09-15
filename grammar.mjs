/**
 * @file C grammar for tree-sitter
 * @author Max Brunsfeld <maxbrunsfeld@gmail.com>
 * @author Amaan Qureshi <amaanq12@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl.d.ts" />
// @ts-check

import {PREC, preprocIf, preprocessor, commaSep, commaSep1} from './grammar-helpers.mjs';

// Named nodes used only as alias targets.
export const
  character = rule(),

  field_identifier = rule(),

  statement_identifier = rule(),

  string_content = rule(),

  type_identifier = rule(),

  translation_unit = rule(() => repeat(_top_level_item)),

  // Top level items are block items with the exception of the expression statement

  _top_level_item = rule(() => choice(
    function_definition,
    alias(_old_style_function_definition, function_definition),
    linkage_specification,
    declaration,
    _top_level_statement,
    attributed_statement,
    type_definition,
    _empty_declaration,
    preproc_if,
    preproc_ifdef,
    preproc_include,
    preproc_def,
    preproc_function_def,
    preproc_call,
  )),

  _block_item = rule(() => choice(
    function_definition,
    alias(_old_style_function_definition, function_definition),
    linkage_specification,
    declaration,
    statement,
    attributed_statement,
    type_definition,
    _empty_declaration,
    preproc_if,
    preproc_ifdef,
    preproc_include,
    preproc_def,
    preproc_function_def,
    preproc_call,
  )),

  // Preprocesser

  preproc_include = rule(() => seq(
    preprocessor('include'),
    field('path', choice(
      string_literal,
      system_lib_string,
      identifier,
      alias(preproc_call_expression, call_expression),
    )),
    token.immediate(/\r?\n/),
  )),

  preproc_def = rule(() => seq(
    preprocessor('define'),
    field('name', identifier),
    field('value', optional(preproc_arg)),
    token.immediate(/\r?\n/),
  )),

  preproc_function_def = rule(() => seq(
    preprocessor('define'),
    field('name', identifier),
    field('parameters', preproc_params),
    field('value', optional(preproc_arg)),
    token.immediate(/\r?\n/),
  )),

  preproc_params = rule(() => seq(
    token.immediate('('), commaSep(choice(identifier, '...')), ')',
  )),

  preproc_call = rule(() => seq(
    field('directive', preproc_directive),
    field('argument', optional(preproc_arg)),
    token.immediate(/\r?\n/),
  )),

  {
    preproc_if,
    preproc_ifdef,
    preproc_else,
    preproc_elif,
    preproc_elifdef,
  } = preprocIf('', () => _block_item, preprocSymbols, 0),

  {
    preproc_if_in_field_declaration_list,
    preproc_ifdef_in_field_declaration_list,
    preproc_else_in_field_declaration_list,
    preproc_elif_in_field_declaration_list,
    preproc_elifdef_in_field_declaration_list,
  } = preprocIf('_in_field_declaration_list', () => _field_declaration_list_item, preprocSymbols, 0),

  {
    preproc_if_in_enumerator_list,
    preproc_ifdef_in_enumerator_list,
    preproc_else_in_enumerator_list,
    preproc_elif_in_enumerator_list,
    preproc_elifdef_in_enumerator_list,
  } = preprocIf('_in_enumerator_list', () => seq(enumerator, ','), preprocSymbols, 0),

  {
    preproc_if_in_enumerator_list_no_comma,
    preproc_ifdef_in_enumerator_list_no_comma,
    preproc_else_in_enumerator_list_no_comma,
    preproc_elif_in_enumerator_list_no_comma,
    preproc_elifdef_in_enumerator_list_no_comma,
  } = preprocIf('_in_enumerator_list_no_comma', () => enumerator, preprocSymbols, -1),

  preproc_arg = rule(() => token(prec(-1, /\S([^/\n]|\/[^*]|\\\r?\n)*/))),

  preproc_directive = rule(() => /#[ \t]*[a-zA-Z0-9]\w*/),

  _preproc_expression = rule(() => choice(
    identifier,
    alias(preproc_call_expression, call_expression),
    number_literal,
    char_literal,
    preproc_defined,
    alias(preproc_unary_expression, unary_expression),
    alias(preproc_binary_expression, binary_expression),
    alias(preproc_parenthesized_expression, parenthesized_expression),
  )),

  preproc_parenthesized_expression = rule(() => seq(
    '(',
    _preproc_expression,
    ')',
  )),

  preproc_defined = rule(() => choice(
    prec(PREC.CALL, seq('defined', '(', identifier, ')')),
    seq('defined', identifier),
  )),

  preproc_unary_expression = rule(() => prec.left(PREC.UNARY, seq(
    field('operator', choice('!', '~', '-', '+')),
    field('argument', _preproc_expression),
  ))),

  preproc_call_expression = rule(() => prec(PREC.CALL, seq(
    field('function', identifier),
    field('arguments', alias(preproc_argument_list, argument_list)),
  ))),

  preproc_argument_list = rule(() => seq(
    '(',
    commaSep(_preproc_expression),
    ')',
  )),

  preproc_binary_expression = rule(() => {
    const table = [
      ['+', PREC.ADD],
      ['-', PREC.ADD],
      ['*', PREC.MULTIPLY],
      ['/', PREC.MULTIPLY],
      ['%', PREC.MULTIPLY],
      ['||', PREC.LOGICAL_OR],
      ['&&', PREC.LOGICAL_AND],
      ['|', PREC.INCLUSIVE_OR],
      ['^', PREC.EXCLUSIVE_OR],
      ['&', PREC.BITWISE_AND],
      ['==', PREC.EQUAL],
      ['!=', PREC.EQUAL],
      ['>', PREC.RELATIONAL],
      ['>=', PREC.RELATIONAL],
      ['<=', PREC.RELATIONAL],
      ['<', PREC.RELATIONAL],
      ['<<', PREC.SHIFT],
      ['>>', PREC.SHIFT],
    ];

    return choice(...table.map(([operator, precedence]) => {
      return prec.left(precedence, seq(
        field('left', _preproc_expression),
        // @ts-ignore
        field('operator', operator),
        field('right', _preproc_expression),
      ));
    }));
  }),

  // Main Grammar

  function_definition = rule(() => seq(
    optional(ms_call_modifier),
    _declaration_specifiers,
    optional(ms_call_modifier),
    field('declarator', _declarator),
    field('body', compound_statement),
  )),

  _old_style_function_definition = rule(() => seq(
    optional(ms_call_modifier),
    _declaration_specifiers,
    field('declarator', alias(_old_style_function_declarator, function_declarator)),
    repeat1(declaration),
    field('body', compound_statement),
  )),

  declaration = rule(() => seq(
    _declaration_specifiers,
    commaSep1(field('declarator', choice(
      seq(
        optional(ms_call_modifier),
        _declaration_declarator,
        optional(gnu_asm_expression),
      ),
      init_declarator,
    ))),
    ';',
  )),

  type_definition = rule(() => seq(
    optional('__extension__'),
    'typedef',
    _type_definition_type,
    _type_definition_declarators,
    repeat(attribute_specifier),
    ';',
  )),

  _type_definition_type = rule(() => seq(repeat(type_qualifier), field('type', type_specifier), repeat(type_qualifier))),

  _type_definition_declarators = rule(() => commaSep1(field('declarator', _type_declarator))),

  _declaration_modifiers = rule(() => choice(
    storage_class_specifier,
    type_qualifier,
    attribute_specifier,
    attribute_declaration,
    ms_declspec_modifier,
  )),

  _declaration_specifiers = rule(() => prec.right(seq(
    repeat(_declaration_modifiers),
    field('type', type_specifier),
    repeat(_declaration_modifiers),
  ))),

  linkage_specification = rule(() => seq(
    'extern',
    field('value', string_literal),
    field('body', choice(
      function_definition,
      declaration,
      declaration_list,
    )),
  )),

  attribute_specifier = rule(() => seq(
    choice('__attribute__', '__attribute'),
    '(',
    argument_list,
    ')',
  )),

  attribute = rule(() => seq(
    optional(seq(field('prefix', identifier), '::')),
    field('name', identifier),
    optional(argument_list),
  )),

  attribute_declaration = rule(() => seq(
    '[[',
    commaSep1(attribute),
    ']]',
  )),

  ms_declspec_modifier = rule(() => seq(
    '__declspec',
    '(',
    identifier,
    ')',
  )),

  ms_based_modifier = rule(() => seq(
    '__based',
    argument_list,
  )),

  ms_call_modifier = rule(() => choice(
    '__cdecl',
    '__clrcall',
    '__stdcall',
    '__fastcall',
    '__thiscall',
    '__vectorcall',
  )),

  ms_restrict_modifier = rule(() => '__restrict'),

  ms_unsigned_ptr_modifier = rule(() => '__uptr'),

  ms_signed_ptr_modifier = rule(() => '__sptr'),

  ms_unaligned_ptr_modifier = rule(() => choice('_unaligned', '__unaligned')),

  ms_pointer_modifier = rule(() => choice(
    ms_unaligned_ptr_modifier,
    ms_restrict_modifier,
    ms_unsigned_ptr_modifier,
    ms_signed_ptr_modifier,
  )),

  declaration_list = rule(() => seq(
    '{',
    repeat(_block_item),
    '}',
  )),

  _declarator = rule(() => choice(
    attributed_declarator,
    pointer_declarator,
    function_declarator,
    array_declarator,
    parenthesized_declarator,
    identifier,
  )),

  _declaration_declarator = rule(() => choice(
    attributed_declarator,
    pointer_declarator,
    alias(_function_declaration_declarator, function_declarator),
    array_declarator,
    parenthesized_declarator,
    identifier,
  )),

  _field_declarator = rule(() => choice(
    alias(attributed_field_declarator, attributed_declarator),
    alias(pointer_field_declarator, pointer_declarator),
    alias(function_field_declarator, function_declarator),
    alias(array_field_declarator, array_declarator),
    alias(parenthesized_field_declarator, parenthesized_declarator),
    _field_identifier,
  )),

  _type_declarator = rule(() => choice(
    alias(attributed_type_declarator, attributed_declarator),
    alias(pointer_type_declarator, pointer_declarator),
    alias(function_type_declarator, function_declarator),
    alias(array_type_declarator, array_declarator),
    alias(parenthesized_type_declarator, parenthesized_declarator),
    _type_identifier,
    alias(choice('signed', 'unsigned', 'long', 'short'), primitive_type),
    primitive_type,
  )),

  _abstract_declarator = rule(() => choice(
    abstract_pointer_declarator,
    abstract_function_declarator,
    abstract_array_declarator,
    abstract_parenthesized_declarator,
  )),

  parenthesized_declarator = rule(() => prec.dynamic(PREC.PAREN_DECLARATOR, seq(
    '(',
    optional(ms_call_modifier),
    _declarator,
    ')',
  ))),

  parenthesized_field_declarator = rule(() => prec.dynamic(PREC.PAREN_DECLARATOR, seq(
    '(',
    optional(ms_call_modifier),
    _field_declarator,
    ')',
  ))),

  parenthesized_type_declarator = rule(() => prec.dynamic(PREC.PAREN_DECLARATOR, seq(
    '(',
    optional(ms_call_modifier),
    _type_declarator,
    ')',
  ))),

  abstract_parenthesized_declarator = rule(() => prec(1, seq(
    '(',
    optional(ms_call_modifier),
    _abstract_declarator,
    ')',
  ))),


  attributed_declarator = rule(() => prec.right(seq(
    _declarator,
    repeat1(attribute_declaration),
  ))),

  attributed_field_declarator = rule(() => prec.right(seq(
    _field_declarator,
    repeat1(attribute_declaration),
  ))),

  attributed_type_declarator = rule(() => prec.right(seq(
    _type_declarator,
    repeat1(attribute_declaration),
  ))),

  pointer_declarator = rule(() => prec.dynamic(1, prec.right(seq(
    optional(ms_based_modifier),
    '*',
    repeat(ms_pointer_modifier),
    repeat(type_qualifier),
    field('declarator', _declarator),
  )))),

  pointer_field_declarator = rule(() => prec.dynamic(1, prec.right(seq(
    optional(ms_based_modifier),
    '*',
    repeat(ms_pointer_modifier),
    repeat(type_qualifier),
    field('declarator', _field_declarator),
  )))),

  pointer_type_declarator = rule(() => prec.dynamic(1, prec.right(seq(
    optional(ms_based_modifier),
    '*',
    repeat(ms_pointer_modifier),
    repeat(type_qualifier),
    field('declarator', _type_declarator),
  )))),

  abstract_pointer_declarator = rule(() => prec.dynamic(1, prec.right(seq('*',
    repeat(ms_pointer_modifier),
    repeat(type_qualifier),
    field('declarator', optional(_abstract_declarator)),
  )))),

  function_declarator = rule(() => prec.right(1,
    seq(
      field('declarator', _declarator),
      field('parameters', parameter_list),
      optional(gnu_asm_expression),
      repeat(choice(
        attribute_specifier,
        identifier,
        alias(preproc_call_expression, call_expression),
      )),
    ),
  )),

  _function_declaration_declarator = rule(() => prec.right(1,
    seq(
      field('declarator', _declarator),
      field('parameters', parameter_list),
      optional(gnu_asm_expression),
      repeat(attribute_specifier),
    ))),

  function_field_declarator = rule(() => prec(1, seq(
    field('declarator', _field_declarator),
    field('parameters', parameter_list),
  ))),

  function_type_declarator = rule(() => prec(1, seq(
    field('declarator', _type_declarator),
    field('parameters', parameter_list),
  ))),

  abstract_function_declarator = rule(() => prec(1, seq(
    field('declarator', optional(_abstract_declarator)),
    field('parameters', parameter_list),
  ))),

  _old_style_function_declarator = rule(() => seq(
    field('declarator', _declarator),
    field('parameters', alias(_old_style_parameter_list, parameter_list)),
  )),

  array_declarator = rule(() => prec(1, seq(
    field('declarator', _declarator),
    '[',
    repeat(choice(type_qualifier, 'static')),
    field('size', optional(choice(expression, '*'))),
    ']',
  ))),

  array_field_declarator = rule(() => prec(1, seq(
    field('declarator', _field_declarator),
    '[',
    repeat(choice(type_qualifier, 'static')),
    field('size', optional(choice(expression, '*'))),
    ']',
  ))),

  array_type_declarator = rule(() => prec(1, seq(
    field('declarator', _type_declarator),
    '[',
    repeat(choice(type_qualifier, 'static')),
    field('size', optional(choice(expression, '*'))),
    ']',
  ))),

  abstract_array_declarator = rule(() => prec(1, seq(
    field('declarator', optional(_abstract_declarator)),
    '[',
    repeat(choice(type_qualifier, 'static')),
    field('size', optional(choice(expression, '*'))),
    ']',
  ))),

  init_declarator = rule(() => seq(
    field('declarator', _declarator),
    '=',
    field('value', choice(initializer_list, expression)),
  )),

  compound_statement = rule(() => seq(
    '{',
    repeat(_block_item),
    '}',
  )),

  storage_class_specifier = rule(() => choice(
    'extern',
    'static',
    'auto',
    'register',
    'inline',
    '__inline',
    '__inline__',
    '__forceinline',
    'thread_local',
    '__thread',
  )),

  type_qualifier = rule(() => choice(
    'const',
    'constexpr',
    'volatile',
    'restrict',
    '__restrict__',
    '__extension__',
    '_Atomic',
    '_Noreturn',
    'noreturn',
    '_Nonnull',
    alignas_qualifier,
  )),

  alignas_qualifier = rule(() => seq(
    choice('alignas', '_Alignas'),
    '(',
    choice(expression, type_descriptor),
    ')',
  )),

  type_specifier = rule(() => choice(
    struct_specifier,
    union_specifier,
    enum_specifier,
    macro_type_specifier,
    sized_type_specifier,
    primitive_type,
    _type_identifier,
  )),

  sized_type_specifier = rule(() => choice(
    seq(
      repeat(choice(
        'signed',
        'unsigned',
        'long',
        'short',
      )),
      field('type', optional(choice(
        prec.dynamic(-1, _type_identifier),
        primitive_type,
      ))),
      repeat1(choice(
        'signed',
        'unsigned',
        'long',
        'short',
      )),
    ),
    seq(
      repeat1(choice(
        'signed',
        'unsigned',
        'long',
        'short',
      )),
      repeat(type_qualifier),
      field('type', optional(choice(
        prec.dynamic(-1, _type_identifier),
        primitive_type,
      ))),
      repeat(choice(
        'signed',
        'unsigned',
        'long',
        'short',
      )),
    ),
  )),

  primitive_type = rule(() => token(choice(
    'bool',
    'char',
    'int',
    'float',
    'double',
    'void',
    'size_t',
    'ssize_t',
    'ptrdiff_t',
    'intptr_t',
    'uintptr_t',
    'charptr_t',
    'nullptr_t',
    'max_align_t',
    ...[8, 16, 32, 64].map(n => `int${n}_t`),
    ...[8, 16, 32, 64].map(n => `uint${n}_t`),
    ...[8, 16, 32, 64].map(n => `char${n}_t`),
  ))),

  enum_specifier = rule(() => seq(
    'enum',
    choice(
      seq(
        field('name', _type_identifier),
        optional(seq(':', field('underlying_type', primitive_type))),
        field('body', optional(enumerator_list)),
      ),
      field('body', enumerator_list),
    ),
    optional(attribute_specifier),
  )),

  enumerator_list = rule(() => seq(
    '{',
    repeat(choice(
      seq(enumerator, ','),
      alias(preproc_if_in_enumerator_list, preproc_if),
      alias(preproc_ifdef_in_enumerator_list, preproc_ifdef),
      seq(preproc_call, ','),
    )),
    optional(seq(
      choice(
        enumerator,
        alias(preproc_if_in_enumerator_list_no_comma, preproc_if),
        alias(preproc_ifdef_in_enumerator_list_no_comma, preproc_ifdef),
        preproc_call,
      ),
    )),
    '}',
  )),

  struct_specifier = rule(() => prec.right(seq(
    'struct',
    optional(attribute_specifier),
    optional(ms_declspec_modifier),
    choice(
      seq(
        field('name', _type_identifier),
        field('body', optional(field_declaration_list)),
      ),
      field('body', field_declaration_list),
    ),
    optional(attribute_specifier),
  ))),

  union_specifier = rule(() => prec.right(seq(
    'union',
    optional(ms_declspec_modifier),
    choice(
      seq(
        field('name', _type_identifier),
        field('body', optional(field_declaration_list)),
      ),
      field('body', field_declaration_list),
    ),
    optional(attribute_specifier),
  ))),

  field_declaration_list = rule(() => seq(
    '{',
    repeat(_field_declaration_list_item),
    '}',
  )),

  _field_declaration_list_item = rule(() => choice(
    field_declaration,
    preproc_def,
    preproc_function_def,
    preproc_call,
    alias(preproc_if_in_field_declaration_list, preproc_if),
    alias(preproc_ifdef_in_field_declaration_list, preproc_ifdef),
  )),

  field_declaration = rule(() => seq(
    _declaration_specifiers,
    optional(_field_declaration_declarator),
    optional(attribute_specifier),
    ';',
  )),

  _field_declaration_declarator = rule(() => commaSep1(seq(
    field('declarator', _field_declarator),
    optional(bitfield_clause),
  ))),

  bitfield_clause = rule(() => seq(':', expression)),

  enumerator = rule(() => seq(
    field('name', identifier),
    optional(seq('=', field('value', expression))),
  )),

  variadic_parameter = rule(() => '...'),

  parameter_list = rule(() => seq(
    '(',
    choice(
      commaSep(choice(parameter_declaration, variadic_parameter)),
      compound_statement,
    ),
    ')',
  )),

  _old_style_parameter_list = rule(() => seq(
    '(',
    commaSep(choice(identifier, variadic_parameter)),
    ')',
  )),

  parameter_declaration = rule(() => seq(
    _declaration_specifiers,
    optional(field('declarator', choice(
      _declarator,
      _abstract_declarator,
    ))),
    repeat(attribute_specifier),
  )),

  // Statements

  attributed_statement = rule(() => seq(
    repeat1(attribute_declaration),
    statement,
  )),

  statement = rule(() => choice(
    case_statement,
    _non_case_statement,
  )),

  _non_case_statement = rule(() => choice(
    attributed_statement,
    labeled_statement,
    compound_statement,
    expression_statement,
    if_statement,
    switch_statement,
    do_statement,
    while_statement,
    for_statement,
    return_statement,
    break_statement,
    continue_statement,
    goto_statement,
    seh_try_statement,
    seh_leave_statement,
  )),

  _top_level_statement = rule(() => choice(
    case_statement,
    attributed_statement,
    labeled_statement,
    compound_statement,
    alias(_top_level_expression_statement, expression_statement),
    if_statement,
    switch_statement,
    do_statement,
    while_statement,
    for_statement,
    return_statement,
    break_statement,
    continue_statement,
    goto_statement,
  )),

  labeled_statement = rule(() => seq(
    field('label', _statement_identifier),
    ':',
    choice(declaration, statement),
  )),

  // This is missing binary expressions, others were kept so that macro code can be parsed better and code examples

  _top_level_expression_statement = rule(() => seq(
    optional(_expression_not_binary),
    ';',
  )),

  expression_statement = rule(() => seq(
    optional(choice(
      expression,
      comma_expression,
    )),
    ';',
  )),

  if_statement = rule(() => prec.right(seq(
    'if',
    field('condition', parenthesized_expression),
    field('consequence', statement),
    optional(field('alternative', else_clause)),
  ))),

  else_clause = rule(() => seq('else', statement)),

  switch_statement = rule(() => seq(
    'switch',
    field('condition', parenthesized_expression),
    field('body', compound_statement),
  )),

  case_statement = rule(() => prec.right(seq(
    choice(
      seq('case', field('value', expression)),
      'default',
    ),
    ':',
    repeat(choice(
      _non_case_statement,
      declaration,
      type_definition,
    )),
  ))),

  while_statement = rule(() => seq(
    'while',
    field('condition', parenthesized_expression),
    field('body', statement),
  )),

  do_statement = rule(() => seq(
    'do',
    field('body', statement),
    'while',
    field('condition', parenthesized_expression),
    ';',
  )),

  for_statement = rule(() => seq(
    'for',
    '(',
    _for_statement_body,
    ')',
    field('body', statement),
  )),

  _for_statement_body = rule(() => seq(
    choice(
      field('initializer', declaration),
      seq(field('initializer', optional(choice(expression, comma_expression))), ';'),
    ),
    field('condition', optional(choice(expression, comma_expression))),
    ';',
    field('update', optional(choice(expression, comma_expression))),
  )),

  return_statement = rule(() => seq(
    'return',
    optional(choice(expression, comma_expression)),
    ';',
  )),

  break_statement = rule(() => seq(
    'break', ';',
  )),

  continue_statement = rule(() => seq(
    'continue', ';',
  )),

  goto_statement = rule(() => seq(
    'goto',
    field('label', _statement_identifier),
    ';',
  )),

  seh_try_statement = rule(() => seq(
    '__try',
    field('body', compound_statement),
    choice(seh_except_clause, seh_finally_clause),
  )),

  seh_except_clause = rule(() => seq(
    '__except',
    field('filter', parenthesized_expression),
    field('body', compound_statement),
  )),

  seh_finally_clause = rule(() => seq(
    '__finally',
    field('body', compound_statement),
  )),

  seh_leave_statement = rule(() => seq(
    '__leave', ';',
  )),

  // Expressions

  expression = rule(() => choice(
    _expression_not_binary,
    binary_expression,
  )),

  _expression_not_binary = rule(() => choice(
    conditional_expression,
    assignment_expression,
    unary_expression,
    update_expression,
    cast_expression,
    pointer_expression,
    sizeof_expression,
    alignof_expression,
    offsetof_expression,
    generic_expression,
    subscript_expression,
    call_expression,
    field_expression,
    compound_literal_expression,
    identifier,
    number_literal,
    _string,
    _true,
    _false,
    _null,
    char_literal,
    parenthesized_expression,
    gnu_asm_expression,
    extension_expression,
  )),

  _string = rule(() => prec.left(choice(
    string_literal,
    concatenated_string,
  ))),

  comma_expression = rule(() => seq(
    field('left', expression),
    ',',
    field('right', choice(expression, comma_expression)),
  )),

  conditional_expression = rule(() => prec.right(PREC.CONDITIONAL, seq(
    field('condition', expression),
    '?',
    optional(field('consequence', choice(expression, comma_expression))),
    ':',
    field('alternative', expression),
  ))),

  _assignment_left_expression = rule(() => choice(
    identifier,
    call_expression,
    field_expression,
    pointer_expression,
    subscript_expression,
    parenthesized_expression,
  )),

  assignment_expression = rule(() => prec.right(PREC.ASSIGNMENT, seq(
    field('left', _assignment_left_expression),
    field('operator', choice(
      '=',
      '*=',
      '/=',
      '%=',
      '+=',
      '-=',
      '<<=',
      '>>=',
      '&=',
      '^=',
      '|=',
    )),
    field('right', expression),
  ))),

  pointer_expression = rule(() => prec.left(PREC.CAST, seq(
    field('operator', choice('*', '&')),
    field('argument', expression),
  ))),

  unary_expression = rule(() => prec.left(PREC.UNARY, seq(
    field('operator', choice('!', '~', '-', '+')),
    field('argument', expression),
  ))),

  binary_expression = rule(() => {
    const table = [
      ['+', PREC.ADD],
      ['-', PREC.ADD],
      ['*', PREC.MULTIPLY],
      ['/', PREC.MULTIPLY],
      ['%', PREC.MULTIPLY],
      ['||', PREC.LOGICAL_OR],
      ['&&', PREC.LOGICAL_AND],
      ['|', PREC.INCLUSIVE_OR],
      ['^', PREC.EXCLUSIVE_OR],
      ['&', PREC.BITWISE_AND],
      ['==', PREC.EQUAL],
      ['!=', PREC.EQUAL],
      ['>', PREC.RELATIONAL],
      ['>=', PREC.RELATIONAL],
      ['<=', PREC.RELATIONAL],
      ['<', PREC.RELATIONAL],
      ['<<', PREC.SHIFT],
      ['>>', PREC.SHIFT],
    ];

    return choice(...table.map(([operator, precedence]) => {
      return prec.left(precedence, seq(
        field('left', expression),
        // @ts-ignore
        field('operator', operator),
        field('right', expression),
      ));
    }));
  }),

  update_expression = rule(() => {
    const argument = field('argument', expression);
    const operator = field('operator', choice('--', '++'));
    return prec.right(PREC.UNARY, choice(
      seq(operator, argument),
      seq(argument, operator),
    ));
  }),

  cast_expression = rule(() => prec(PREC.CAST, seq(
    '(',
    field('type', type_descriptor),
    ')',
    field('value', expression),
  ))),

  type_descriptor = rule(() => seq(
    repeat(type_qualifier),
    field('type', type_specifier),
    repeat(type_qualifier),
    field('declarator', optional(_abstract_declarator)),
  )),

  sizeof_expression = rule(() => prec(PREC.SIZEOF, seq(
    'sizeof',
    choice(
      field('value', expression),
      seq('(', field('type', type_descriptor), ')'),
    ),
  ))),

  alignof_expression = rule(() => prec(PREC.SIZEOF, seq(
    choice('__alignof__', '__alignof', '_alignof', 'alignof', '_Alignof'),
    seq('(', field('type', type_descriptor), ')'),
  ))),

  offsetof_expression = rule(() => prec(PREC.OFFSETOF, seq(
    'offsetof',
    seq('(', field('type', type_descriptor), ',', field('member', _field_identifier), ')'),
  ))),

  generic_expression = rule(() => prec(PREC.CALL, seq(
    '_Generic',
    '(',
    expression,
    ',',
    commaSep1(seq(type_descriptor, ':', expression)),
    ')',
  ))),

  subscript_expression = rule(() => prec(PREC.SUBSCRIPT, seq(
    field('argument', expression),
    '[',
    field('index', expression),
    ']',
  ))),

  call_expression = rule(() => prec(PREC.CALL, seq(
    field('function', expression),
    field('arguments', argument_list),
  ))),

  gnu_asm_expression = rule(() => prec(PREC.CALL, seq(
    choice('asm', '__asm__', '__asm'),
    repeat(gnu_asm_qualifier),
    '(',
    field('assembly_code', _string),
    optional(seq(
      field('output_operands', gnu_asm_output_operand_list),
      optional(seq(
        field('input_operands', gnu_asm_input_operand_list),
        optional(seq(
          field('clobbers', gnu_asm_clobber_list),
          optional(field('goto_labels', gnu_asm_goto_list)),
        )),
      )),
    )),
    ')',
  ))),

  gnu_asm_qualifier = rule(() => choice(
    'volatile',
    '__volatile__',
    'inline',
    'goto',
  )),

  gnu_asm_output_operand_list = rule(() => seq(
    ':',
    commaSep(field('operand', gnu_asm_output_operand)),
  )),

  gnu_asm_output_operand = rule(() => seq(
    optional(seq(
      '[',
      field('symbol', identifier),
      ']',
    )),
    field('constraint', string_literal),
    '(',
    field('value', expression),
    ')',
  )),

  gnu_asm_input_operand_list = rule(() => seq(
    ':',
    commaSep(field('operand', gnu_asm_input_operand)),
  )),

  gnu_asm_input_operand = rule(() => seq(
    optional(seq(
      '[',
      field('symbol', identifier),
      ']',
    )),
    field('constraint', string_literal),
    '(',
    field('value', expression),
    ')',
  )),

  gnu_asm_clobber_list = rule(() => seq(
    ':',
    commaSep(field('register', _string)),
  )),

  gnu_asm_goto_list = rule(() => seq(
    ':',
    commaSep(field('label', identifier)),
  )),

  extension_expression = rule(() => seq('__extension__', expression)),

  // The compound_statement is added to parse macros taking statements as arguments, e.g. MYFORLOOP(1, 10, i, { foo(i); bar(i); })

  argument_list = rule(() => seq('(', commaSep(choice(expression, compound_statement)), ')')),

  field_expression = rule(() => seq(
    prec(PREC.FIELD, seq(
      field('argument', expression),
      field('operator', choice('.', '->')),
    )),
    field('field', _field_identifier),
  )),

  compound_literal_expression = rule(() => seq(
    '(',
    field('type', type_descriptor),
    ')',
    field('value', initializer_list),
  )),

  parenthesized_expression = rule(() => seq(
    '(',
    choice(expression, comma_expression, compound_statement),
    ')',
  )),

  initializer_list = rule(() => seq(
    '{',
    commaSep(choice(
      initializer_pair,
      expression,
      initializer_list,
    )),
    optional(','),
    '}',
  )),

  initializer_pair = rule(() => choice(
    seq(
      field('designator', repeat1(choice(
        subscript_designator,
        field_designator,
        subscript_range_designator,
      ))),
      '=',
      field('value', choice(expression, initializer_list)),
    ),
    seq(
      field('designator', _field_identifier),
      ':',
      field('value', choice(expression, initializer_list)),
    ),
  )),

  subscript_designator = rule(() => seq('[', expression, ']')),

  subscript_range_designator = rule(() => seq('[', field('start', expression), '...', field('end', expression), ']')),

  field_designator = rule(() => seq('.', _field_identifier)),

  number_literal = rule(() => {
    const separator = '\'';
    const hex = /[0-9a-fA-F]/;
    const decimal = /[0-9]/;
    const hexDigits = seq(repeat1(hex), repeat(seq(separator, repeat1(hex))));
    const decimalDigits = seq(repeat1(decimal), repeat(seq(separator, repeat1(decimal))));
    return token(seq(
      optional(/[-\+]/),
      optional(choice(/0[xX]/, /0[bB]/)),
      choice(
        seq(
          choice(
            decimalDigits,
            seq(/0[bB]/, decimalDigits),
            seq(/0[xX]/, hexDigits),
          ),
          optional(seq('.', optional(hexDigits))),
        ),
        seq('.', decimalDigits),
      ),
      optional(seq(
        /[eEpP]/,
        optional(seq(
          optional(/[-\+]/),
          hexDigits,
        )),
      )),
      /[uUlLwWfFbBdD]*/,
    ));
  }),

  char_literal = rule(() => seq(
    choice('L\'', 'u\'', 'U\'', 'u8\'', '\''),
    repeat1(choice(
      escape_sequence,
      alias(token.immediate(/[^\n']/), character),
    )),
    '\'',
  )),

  // Must concatenate at least 2 nodes, one of which must be a string_literal.
  // Identifier is added to parse macros that are strings, like PRIu64.

  concatenated_string = rule(() => prec.right(seq(
    choice(
      seq(identifier, string_literal),
      seq(string_literal, string_literal),
      seq(string_literal, identifier),
    ),
    repeat(choice(string_literal, identifier)),
  ))),

  string_literal = rule(() => seq(
    choice('L"', 'u"', 'U"', 'u8"', '"'),
    repeat(choice(
      alias(token.immediate(prec(1, /[^\\"\n]+/)), string_content),
      escape_sequence,
    )),
    '"',
  )),

  escape_sequence = rule(() => token(prec(1, seq(
    '\\',
    choice(
      /[^xuU]/,
      /\d{2,3}/,
      /x[0-9a-fA-F]{1,4}/,
      /u[0-9a-fA-F]{4}/,
      /U[0-9a-fA-F]{8}/,
    ),
  )))),

  system_lib_string = rule(() => token(seq(
    '<',
    repeat(choice(/[^>\n]/, '\\>')),
    '>',
  )));

const _true = rule(() => token(choice('TRUE', 'true'))),

  _false = rule(() => token(choice('FALSE', 'false'))),

  _null = rule(() => choice('NULL', 'nullptr'));

export const
  identifier = rule(() =>
    new RustRegex(String.raw`(\p{XID_Start}|\$|_|\\u[0-9A-Fa-f]{4}|\\U[0-9A-Fa-f]{8})(\p{XID_Continue}|\$|\\u[0-9A-Fa-f]{4}|\\U[0-9A-Fa-f]{8})*`)),

  _type_identifier = rule(() => alias(
    identifier,
    type_identifier,
  )),

  _field_identifier = rule(() => alias(identifier, field_identifier)),

  _statement_identifier = rule(() => alias(identifier, statement_identifier)),

  _empty_declaration = rule(() => seq(
    type_specifier,
    ';',
  )),

  macro_type_specifier = rule(() => prec.dynamic(-1, seq(
    field('name', identifier),
    '(',
    field('type', type_descriptor),
    ')',
  ))),

  // http://stackoverflow.com/questions/13014947/regex-to-match-a-c-style-multiline-comment/36328890#36328890

  comment = rule(() => token(choice(
    seq('//', /(\\+(.|\r?\n)|[^\\\n])*/),
    seq(
      '/*',
      /[^*]*\*+([^/*][^*]*\*+)*/,
      '/',
    ),
  )));

export {_true as true, _false as false, _null as null};

/**
 * Resolve references lazily, after every exported handle is initialized.
 */
function preprocSymbols() {
  return {_preproc_expression, identifier, preproc_else, preproc_elif, preproc_elifdef};
}

/** @satisfies {ModuleGrammar} */
export default {
  name: 'c',
  start: translation_unit,

  conflicts: [
    [type_specifier, _declarator],
    [type_specifier, _declarator, macro_type_specifier],
    [type_specifier, expression],
    [type_specifier, expression, macro_type_specifier],
    [type_specifier, macro_type_specifier],
    [type_specifier, sized_type_specifier],
    [sized_type_specifier],
    [attributed_statement],
    [_declaration_modifiers, attributed_statement],
    [enum_specifier],
    [type_specifier, _old_style_parameter_list],
    [parameter_list, _old_style_parameter_list],
    [function_declarator, _function_declaration_declarator],
    [_block_item, statement],
    [_top_level_item, _top_level_statement],
    [type_specifier, _top_level_expression_statement],
    [type_qualifier, extension_expression],
  ],

  extras: [
    /\s|\\\r?\n/,
    comment,
  ],

  inline: [
    _type_identifier,
    _field_identifier,
    _statement_identifier,
    _non_case_statement,
    _assignment_left_expression,
    _expression_not_binary,
  ],

  supertypes: [
    expression,
    statement,
    type_specifier,
    _declarator,
    _field_declarator,
    _type_declarator,
    _abstract_declarator,
  ],

  word: identifier,
};
