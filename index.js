/* jshint esversion: 6, node: true */
'use strict';

const PORT = process.env.PORT || 8000;

const STATUS_CODES = {
  100: 'Continue',
  101: 'Switching Protocols',
  102: 'Processing',
  103: 'Early Hints',
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  205: 'Reset Content',
  206: 'Partial Content',
  207: 'Multi-Status',
  208: 'Already Reported',
  226: 'IM Used',
  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  305: 'Use Proxy',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Payload Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Range Not Satisfiable',
  417: 'Expectation Failed',
  418: "I'm a Teapot",
  421: 'Misdirected Request',
  422: 'Unprocessable Entity',
  423: 'Locked',
  424: 'Failed Dependency',
  425: 'Too Early',
  426: 'Upgrade Required',
  428: 'Precondition Required',
  429: 'Too Many Requests',
  431: 'Request Header Fields Too Large',
  451: 'Unavailable For Legal Reasons',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  506: 'Variant Also Negotiates',
  507: 'Insufficient Storage',
  508: 'Loop Detected',
  509: 'Bandwidth Limit Exceeded',
  510: 'Not Extended',
  511: 'Network Authentication Required',
};

const http = require('http'),
  fs = require('fs');

var methods = Object.create(null);

function urlToPath(url) {
  var path = require('url').parse(url).pathname;
  return '.' + decodeURIComponent(path);
}

function respondeErrorOrNothing(respond) {
  return function (error) {
    if (error) {
      respond(500, error.toString());
    } else {
      respond(204); // No content
    }
  };
}

const server = http.createServer(function (request, response) {
  function respond(code, body, type) {
    if (!type) {
      type = 'text/plain';
    }
    response.writeHead(code, { 'content-type': type });
    if (body && body.pipe) {
      body.pipe(response);
    } else {
      response.end(body);
    }
    console.log(`>> ${request.method} ${urlToPath(request.url)} ${code}`);
  }
  if (request.method in methods) {
    methods[request.method](urlToPath(request.url), respond, request);
  } else {
    respond(405, 'Method ' + request.method + ' not allowed');
  }
});

server.listen(PORT, function () {
  // const address = this.address();
  console.log(`Listening at http://localhost:${PORT}`);
});

methods.GET = function (path, respond) {
  fs.stat(path, function (error, stats) {
    if (error && error.code == 'ENOENT') {
      respond(404, 'File not found');
    } else if (error) {
      respond(500, error.toString());
    } else if (stats.isDirectory()) {
      fs.readdir(path, function (error, files) {
        if (error) {
          respond(500, error.toString());
        } else {
          respond(200, files.join('\n'));
        }
      });
    } else {
      respond(200, fs.createReadStream(path), require('mime').getType(path));
    }
  });
};

methods.DELETE = function (path, respond) {
  fs.stat(path, function (error, stats) {
    if (error && error.code == 'ENOENT') {
      /* If file does not exist, it's OK. We wanted to delete a file and it's
       * gone. */
      respond(204);
    } else if (error) {
      respond(500, error.toString());
    } else if (stats.isDirectory()) {
      fs.rmdir(path, respondeErrorOrNothing(respond));
    } else {
      fs.unlink(path, respondeErrorOrNothing);
    }
  });
};

methods.PUT = function (path, respond, request) {
  const outStream = fs.createWriteStream(path);
  outStream.on('error', (error) => {
    respond(500, error.toString());
  });
  outStream.on('finish', () => {
    respond(204);
  });
  request.pipe(outStream);
};
