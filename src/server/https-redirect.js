/**
* Create a middleware to redirect http requests to https
* @param {Object} options Options
* @returns {Function} The express middleware handler
*/
module.exports = (req, res, next) => {
  if (req.protocol != 'https' && process.env.NODE_ENV == 'production') {
    var parts = req.get('host').split(':');
    var host = parts[0] || '127.0.0.1';
    console.log('Redirecting: ' + 'https://' + host + req.url);
    return res.redirect('https://' + host + req.url);
  }
  next();
};