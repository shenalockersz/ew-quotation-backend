export default function errorHandler(err, req, res, next) {
  // You can expand with error types/validation handling
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  // Optional: log stack only in non-prod
  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }
  res.status(status).json({ error: message });
}
