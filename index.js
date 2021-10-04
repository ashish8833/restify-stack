const restify = require('restify');

const server = restify.createServer({
    name: 'restify-stack',
    version: '1.0.0'
});

server.use(restify.plugins.bodyParser());

server.get('/hello/:name', (req, res) => {
    res.json({value: `Hello ${req.params.name}, this is restify :)`});
});

require('./router')(server);

server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
});