/*!
 * stylelint-vscode | MIT (c) Shinnosuke Watanabe
 * https://github.com/shinnn/stylelint-vscode
*/
'use strict';

const arrayToError = require('array-to-error');
const DiagnosticSeverity = require('vscode-languageserver').DiagnosticSeverity;
const stylelint = require('stylelint');

module.exports = function stylelintVSCode(options) {
  return stylelint.lint(Object.assign({}, options, {
    code: '',
    files: null
  }))
  .then(function validateRules(firstReport) {
    const invalidOptionWarnings = firstReport.results[0].invalidOptionWarnings;
    if (invalidOptionWarnings.length !== 0) {
      const texts = invalidOptionWarnings.map(warning => warning.text);
      return Promise.reject(arrayToError(texts, SyntaxError));
    }

    return stylelint.lint(options);
  }, function suppressNoConfigurationFoundError(err) {
    if (
      err.message === 'No configuration found' ||
      /No rules found within configuration/.test(err.message)
    ) {
      // Check only CSS syntax errors without applying any stylelint rules
      return stylelint.lint(Object.assign({}, options, {
        config: {
          rules: {}
        }
      }));
    }

    return Promise.reject(err);
  }).then(function makeDiagnostics(report) {
    const diagnostics = [];

    report.results.forEach(result => {
      result.warnings.forEach(warning => {
        diagnostics.push({
          message: `stylelint: ${warning.text}`,
          severity: warning.severity === 'warning' ?
                    DiagnosticSeverity.Warning :
                    DiagnosticSeverity.Error,
          range: {
            start: {
              line: warning.line - 1,
              character: warning.column - 1
            },
            end: {
              line: warning.line - 1,
              character: warning.column - 1
            }
          }
        });
      });
    });

    return diagnostics;
  });
};