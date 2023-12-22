const fs = require('fs')
const Tour = require('../../models/tourModel')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
dotenv.config({path: './config.env'})
console.log('in import-dev-data')

const DB = process.env.DATABASE

mongoose.connect(DB, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
  useUnifiedTopology: true
}).then(con => console.log('DB connection successful'))

//read json file
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours-simple.json`, 'utf-8'))

//import data into database
const importedData = async () => {
    try {
       await Tour.create(tours) 
       console.log('Data Successfully Loaded!')
       process.exit()      
    } catch (error) {
        console.log(error)  
    }
}

//Delete all data from database
const deleteData = async () => {
    try {
        await Tour.deleteMany() 
        console.log('Data Successfully Deleted!')
     } catch (error) {
        console.log(error)  
     }
    process.exit()         
}

if (process.argv[2] === '--import') {
    importedData()
} else if (process.argv[2] === '--delete') {
    deleteData()
}

