/**
 * EduMind AI - Validation Middleware
 * Uses express-validator for input validation
 */

import { validationResult } from 'express-validator';

/**
 * Checks express-validator results and returns 422 if errors found
 */
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: 'error',
      message: 'Validation failed. Please check your input.',
      errors: errors.array().map(e => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
}
