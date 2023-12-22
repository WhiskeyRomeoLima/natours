const mongoose = require('mongoose')
const dotenv = require('dotenv')
dotenv.config({path: './config.env'})
const DB = process.env.DATABASE
const app = require('./app') //app has the listen function - see start server below

mongoose.connect(DB, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
  useUnifiedTopology: true
}).then(con => console.log('DB connection successful'))



//* Start Server
const port = process.env.PORT  || 8000;
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
}); 