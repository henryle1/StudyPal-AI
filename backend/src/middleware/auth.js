module.exports = function authPlaceholder(_req, _res, next) {
  // TODO: validate JWT once auth is implemented.
  // For template purposes we simply proceed.
  next()
}
