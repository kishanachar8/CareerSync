import ApiError from '../utils/ApiError.js';

/**
 * Express middleware that validates request data against a Joi schema.
 *
 * Usage:
 *   validate(schema)           — auto-detects source (body → query → params)
 *   validate(schema, 'body')   — validate req.body explicitly
 *   validate(schema, 'query')  — validate req.query explicitly
 *   validate(schema, 'params') — validate req.params explicitly
 */
const validate = (schema, source) => (req, _res, next) => {
  let target;

  if (source === 'body') {
    target = 'body';
  } else if (source === 'query') {
    target = 'query';
  } else if (source === 'params') {
    target = 'params';
  } else {
    // Auto-detect: body > query > params
    if (Object.keys(req.body || {}).length > 0) target = 'body';
    else if (Object.keys(req.query || {}).length > 0) target = 'query';
    else target = 'params';
  }

  const { error, value } = schema.validate(req[target], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((d) => d.message);
    return next(new ApiError(422, 'Validation failed', messages));
  }

  req[target] = value;
  next();
};

export { validate };
export default validate;
