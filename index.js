const q = require('q')
const request = require('request')
const parse = require('./lib/parse')

module.exports = function (url, options) {
  const dfd = q.defer()
  if (!options || typeof options !== 'object') options = {}
  const opts = Object.assign(
    // defaults
    {
      userAgent: 'MetadataScraper',
      fromEmail: 'example@example.com',
      maxRedirects: 10,
      timeout: 10000,
      descriptionLength: 750,
      ensureSecureImageRequest: true,
      sourceMap: {},
      decode: undefined,
      encode: undefined,
      customHeaders: {}
    },
    // options passed in override defaults
    options
  )

  const headers = {
    'User-Agent': opts.userAgent,
    'From': opts.fromEmail
  };
  Object.keys(opts.customHeaders).forEach(function (key) {
    headers[key] = opts.customHeaders[key];
  });

  const requestOpts = {
    url: url,
    headers: headers,
    maxRedirects: opts.maxRedirects,
    encoding: opts.decode ? null : 'utf8',
    timeout: opts.timeout
  }
  request.get(requestOpts, function (err, response, body) {
    if (!err && response && response.statusCode) {
      if (response.statusCode === 200) {
        if (response.headers && response.headers['content-type'] && response.headers['content-type'].match(/^text\//)) {
          // rewrite url if our request had to follow redirects to resolve the
          // final link destination (for example: links shortened by bit.ly)
          if (response.request.uri.href) url = response.request.uri.href
          if (opts.decode) {
            body = opts.decode(body)
          }
          return dfd.resolve(parse(url, body, opts))
        } else {
          return dfd.reject({ type: 'NOT_TEXT', detail: (response.headers && response.headers['content-type']) })
        }
      } else {
        return dfd.reject({ type: 'NOT_200', detail: response.statusCode })
      }
    } else {
      return dfd.reject({ type: 'UNKNOWN', detail: err })
    }
  })

  return dfd.promise
}
