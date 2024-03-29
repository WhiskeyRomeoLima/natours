const Tour = require('../models/tourModel'); // imports tourModel.js 
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory')

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

//* The async function inside the parentheses is the function (fn) passed into catchAsync
//* see the handler createTour for more detail

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
    // {
    //   $match: { _id: { $ne: 'EASY' } }
    // }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; // 2021

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: { numTourStarts: -1 }
    },
    {
      $limit: 12
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
});

//* /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/34.111745,-118.113491/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params; //destructure from req.params
  const [lat, lng] = latlng.split(','); //destructure of the resulting array -- '34.111745,-118.113491'.split(',') --> [34.111745,-118.113491 ]
//convert distances to radians: if unit = mi then /3963.2 else if kilometers then /6378.1
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400 //bad request
      )
    );
  }
  //startLocation is the property of the tour model we want
  //and we need to create an index for it in the tour model
  const tours = await Tour.find({                 //in geoJSON lng then lat, but convention is lat then lng
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } } //$geoWithin is a geo operator
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  });
});

//*All distances to tours
exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  //set mutilplier to depending what unit the distance is in.  
  //using 1 mile = 0.000621371 meter/mile -- (see $geoNear stage below)
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: { // always first in the pipeline and requires at least of the fields one geo-spatial index
        near: { //basically the point from which to calculate distances to startLocation of each tour
          type: 'Point',
          coordinates: [lng * 1, lat * 1] //convert strings to numbers
        },
        distanceField: 'distance', //the field to store all the caculated distances
        distanceMultiplier: multiplier // distance from geoNear is by default in meters, so convert to kilometers or miles
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  });
});



/*

//* Sample response as an array of json formatted document
{"status":"success",
"results":9,
"data":{"tours"
[
{"startLocation":{"type":"Point","coordinates":[]},"ratingsAverage":4.9,"ratingsQuantity":37,"images":["tour-1-1.jpg","tour-1-2.jpg","tour-1-3.jpg"],"startDates":["2021-04-25T15:00:00.000Z","2021-07-20T15:00:00.000Z","2021-10-05T15:00:00.000Z"],"secretTour":false,"guides":[],"_id":"6567642648037587888a5e11","name":"The Forest Hiker","duration":5,"maxGroupSize":25,"difficulty":"easy","price":397,"summary":"Breathtaking hike through the Canadian Banff National Park","description":"Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\nLorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.","imageCover":"tour-1-cover.jpg","locations":[],"durationWeeks":0.7142857142857143,"id":"6567642648037587888a5e11"},
 ... remaing tours 
]

//* Model stuff

//* two ways to create and save a document
using method off the document: const newTour = new Tour({object goes here}) then newTour.save  

using the create method off of the Tour object
localhost:3000/api/v1/tours?duration=5&difficulty=easy
    we have to provide a way for express to get access to the params in the above query string
    //* first way(//find returns a query which is thenable)
    const tours = await Tour.find(req.query)
    //* second way 
    const tours = await  Tour.find({
        duration: 5,
        difficulty: 'easy'
    }) 
    //* third way
    const tours = await Tour.find()
        .where('duration').equals(5)
        .where('difficulty').equals('easy')


//* Model   
Parameters:
doc «Object» values for initial set

[fields] «Object» optional object containing the fields that were selected in the query 
which returned this document. You do not need to set this parameter to 
ensure Mongoose handles your query projection.

[skipId=false] «Boolean» optional boolean. If true, mongoose doesn't add an _id field 
to the document.

Inherits: from «Document»


A Model is a class that's your primary tool for interacting with MongoDB. An instance of a Model is called a Document.

In Mongoose, the term "Model" refers to subclasses of the mongoose.Model class. You should not use the mongoose.Model class directly. The mongoose.model() and connection.model() functions create subclasses of mongoose.Model as shown below.

Example:
 `UserModel` is a "Model", a subclass of `mongoose.Model`.
const UserModel = mongoose.model('User', new Schema({ name: String }));

 You can use a Model to create new documents using `new`:
const userDoc = new UserModel({ name: 'Foo' });
await userDoc.save();

 You also use a model to create queries:
const userFromDb = await UserModel.findOne({ name: 'Foo' });

*/