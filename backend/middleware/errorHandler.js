export function errorHandler(err, _req, res, _next) {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Internal server error' });
}
export function notFound(_req, res) {
    res.status(404).json({ error: 'Route not found' });
}
