const successResponse = (res, message = 'Operation successful', data = {}, statusCode = 200, extras = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...extras,
    data,
  });
};

const errorResponse = (res, message = 'Error occurred', statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = {
  successResponse,
  errorResponse,
};
