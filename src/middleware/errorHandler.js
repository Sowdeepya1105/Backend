const { errorResponse } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  const message = err.message || 'Internal server error';
  const status = err.status || 500;

  return errorResponse(res, message, status);
};

module.exports = errorHandler;
