;; Scopes

; TODO: Modify the grammar to add function_definition_scope

[(translation_unit)
 (compound_statement)] @local.scope

;; Definitions

; HACK: Matches only up to T var[…][…][…][…][…][…][…] = {…} but higher levels
;       of nesting are extremely rare (i.e. not found in Linux's source code),
;       so it's okay.
(declaration declarator:
 [(identifier) @local.definition
  (_ declarator:
   [(identifier) @local.definition
    (_ declarator:
     [(identifier) @local.definition
      (_ declarator:
       [(identifier) @local.definition
        (_ declarator:
         [(identifier) @local.definition
          (_ declarator:
           [(identifier) @local.definition
            (_ declarator:
             [(identifier) @local.definition
              (_ declarator:
               [(identifier) @local.definition
                (_ declarator: (identifier) @local.definition)])])])])])])])])

(preproc_def name: _ @local.definition)

; HACK: Matches only up to T(*param)[…][…][…], T**(*param)(…) and T*****param
;       but higher levels of nesting are extremely rare (i.e. not found in
;       Linux's source code), so it's okay.
(function_definition
 (function_declarator
  (parameter_list
   (parameter_declaration
    [(identifier) @local.definition
     (_ declarator:
      [(identifier) @local.definition
       (_ declarator:
        [(identifier) @local.definition
         (_ declarator:
          [(identifier) @local.definition
           (_ declarator:
            [(identifier) @local.definition
             (_ declarator: (identifier) @local.definition)])])])])]))))

(preproc_function_def name: _ @local.definition)

(labeled_statement label: _ @local.definition)

;; References

(identifier) @local.reference
