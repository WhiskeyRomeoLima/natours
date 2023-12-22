// Node.js program to create
// http server
 
// Using require to access http module
const http = require("http");
 
// Port number
const PORT = process.env.PORT || 2020;
 
// Creating server
const server = http.createServer(
    // Server listening on port 2020
    function (req, res) {
        res.write('Hello geeksforgeeks!');
        // Write a response to the client
        res.end();
    }
)
    .listen(PORT, error => {
        // Prints in console
        console.log(`Server listening on port ${PORT}`)
    });