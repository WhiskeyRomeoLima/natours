// review / rating / createdAt / ref to tour / ref to user
const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

//to preevent a user reviewing a tours multiple times
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function(next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name'
  // }).populate({
  //   path: 'user',
  //   select: 'name photo'
  // });

  this.populate({
    path: 'user',
    select: 'name photo'
  });
  next();
});

//to call the aggregate funcion we must use a static method
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  console.log('In calcAverageRatings!!')
  const stats = await this.aggregate([ // use stages to accomplish what we need: match and group
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  //console.log(stats);
  //when deleting reviews, we need this if-else to avoid get undefined when deleting the last review
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

reviewSchema.post('save', function() {
  // this points to current review
  this.constructor.calcAverageRatings(this.tour);
});

// findByIdAndUpdate
// findByIdAndDelete
// we do not have direct access to the document with only query middleware
reviewSchema.pre(/^findOneAnd/, async function(next) {
  this.r = await this.findOne(); //we need to get a ref to the document - so r = review so create a property on this and assign the review to it -- this makes the post (below work)
  console.log(this.r);
  next();
});

reviewSchema.post(/^findOneAnd/, async function() { //we have access to this but the review had to be added above
  // await this.findOne(); does NOT work here, query has already executed
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;








/*
//*Virtual Populate
Recall in the schema, we a ref from reviews to tours but not the other way
around. But we do want to query reviews for a selected array
With 'Virtual Populate,' we can actually populate the tour with reviews.
Even though tours do not have a ref to reviews we can get access
to all the reviews for a certain tour, but without keeping this array of review ID's on the tour.

So, think of 'Virtual Populate' like a way of keeping that array of review ID's on a tour,
but without actually persisting it to the database.

//*virtual properties

In Mongoose, when you define a schema for a MongoDB document and 
you have virtual properties (properties that are not stored in the database but 
computed based on existing data), 
you can use the { toJSON: { virtuals: true }, toObject: { virtuals: true } } option to 
ensure that these virtual properties are included when 
the document is converted to JSON or an object.

When you convert a Mongoose document to JSON, whether 
explicitly with toJSON() or implicitly when 
sending the document as a response from an API endpoint, 
virtual properties are not included by default.
 By setting toJSON: { virtuals: true }, 
 you instruct Mongoose to include the virtual properties in the JSON output.

Secondly, the option toObject: { virtuals: true } is similar to toJSON, 
but it applies when you convert a Mongoose document to 
a plain JavaScript object using methods like toObject(). 
This ensures consistency in handling virtuals whether 
you're working with JSON or JavaScript objects.

*/