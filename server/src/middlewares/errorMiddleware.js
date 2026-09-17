export const notFound = (req, res, next) => {
  const error = new Error(`Endpoint không tồn tại: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  console.error(`[Ruo API Error] ${err.message}`, {
    url: req.originalUrl,
    method: req.method,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Lỗi xử lý máy chủ nội bộ',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};
