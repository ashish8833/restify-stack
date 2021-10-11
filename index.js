import { createServer, plugins } from 'restify';

const server = createServer({
    name: 'restify-stack',
    version: '1.0.0'
});

server.use(plugins.bodyParser());

server.get('/hello/:name', (req, res) => {
    res.json({value: `Hello ${req.params.name}, this is restify :)`});
});

require('./router')(server);

server.listen(process.env.PORT, function() {
    console.log('%s listening at %s', server.name, server.url);
});