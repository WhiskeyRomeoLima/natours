// Node.js program to create server
// with help of Express module
 
//* command to generate JWT: node -e "console.log(require('crypto').randomBytes(64).toString('hex'));" 

// Importing express
const express = require('express');
 
// Creating new express app
const app = express();
 
// PORT configuration
const PORT = process.env.PORT || 2020;
 
// IP configuration
const IP = process.env.IP || 2021;
 
// Create a route for the app
app.get('/', (req, res) => {
    res.send('Hello Vikas_g from geeksforgeeks!');
});
 
// Create a route for the app
app.get('*', (req, res) => {
    res.send('OOPS!! The link is broken...');
});
 
// Server listening to requests
app.listen(PORT, IP, () => {
    console.log(`The Server is running at:
        http://localhost:${PORT}/`);
});