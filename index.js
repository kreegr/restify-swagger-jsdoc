var restify = require('restify');
var swaggerJSDoc = require('swagger-jsdoc');
var path = require('path');
var fs = require('fs');
var mime = require('mime-types');

var createSwaggerPage = (options) => {
  if (!options.server) {
    throw new Error('options.server is required');
  } else if (!options.title) {
    throw new Error('options.title is required');
  } else if (!options.version) {
    throw new Error('options.version is required');
  } else if (!options.path) {
    throw new Error('options.path is required');
  }

  var swaggerUiPath = path.dirname(require.resolve('swagger-ui'));

  var swaggerSpec = swaggerJSDoc({
    swaggerDefinition: {
      info: {
        title: options.title,
        version: options.version
      },
    },
    apis: options.apis || []
  });

  // Prepend route prefix if needed
  if (options.routePrefix && swaggerSpec.hasOwnProperty('paths')) {
    for (var prop in swaggerSpec.paths) {
      swaggerSpec.paths['/' + options.routePrefix + prop] = swaggerSpec.paths[prop];
      delete(swaggerSpec.paths[prop]);
    }
  }

  var publicPath = options.path.replace(/\/+$/, '');
  var swaggerJsonFilePath = `${publicPath}/swagger.json`;

  options.server.get(swaggerJsonFilePath, (req, res, next) => {
    res.setHeader('Content-type', 'application/json');
    res.send(swaggerSpec);
    return next();
  });

  options.server.get(new RegExp(publicPath + '\/?$'), (req, res, next) => {
    res.header('Location', `${publicPath}/index.html`);
    res.send(302);
    return next();
  });

  options.server.get(new RegExp(publicPath + '\/(.*)$'), (req, res, next) => {
    fs.readFile(path.resolve(swaggerUiPath, req.params[0]), (err, content) => {
      if (err) {
        return next(new restify.errors.NotFoundError(`File ${req.params[0]} does not exist`));
      }

      if (req.params[0] === 'index.html') {
        content = content.toString().replace('url = "http://petstore.swagger.io/v2/swagger.json"', `url ="${swaggerJsonFilePath}"`);
      }

      var contentType = mime.lookup(req.params[0]);
      if (contentType !== false) {
        res.setHeader('Content-Type', contentType);
      }

      res.write(content);
      res.end();
      return next();
    });
  });
};

module.exports = {
  createSwaggerPage: createSwaggerPage
};