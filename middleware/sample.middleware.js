module.exports = {
    addValues: (req, res, next) => {
        console.log("Process value in middle ware");
        req.body.middleware = 'Add value from middle ware';
        next();
    }
}