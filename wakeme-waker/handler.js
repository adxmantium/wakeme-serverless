'use strict';

// libs
const AWS = require('aws-sdk');
const moment = require('moment');

// constants
const region = 'us-west-1';
const DB = new AWS.DynamoDB.DocumentClient({ region });
const S3 = new AWS.S3({ region })
const TABLE = process.env.DB_TABLE_NAME;
const S3_BUCKET = process.env.S3_BUCKET_NAME;
const CREATED_FORMAT = 'YYYY-DD-MM_HH:MM:SS';

// response consts
const response = {
  statusCode: 200,
  body: JSON.stringify({})
};

const error = {
  statusCode: 200,
  data: {
    error: true,
    message: 'Invalid or undefined queryStringParameters',
  }
}



/*
  - function: returns all wakers based of of fb_user_id
  - return: list of wakers
*/
module.exports.getWakers = (e, context, cb) => {
  
  const input = e.queryStringParameters;
  const attr = 'to_fb_user_id';

  if( !input ) cb(error, null);

  const params = {
    TableName: TABLE,
    Limit: 50,
    FilterExpression: `${attr} = :val`,
    ExpressionAttributeValues: {
        ":val": input[attr]
    },
  }

  DB.scan(params, (err, data) => {

    if( err ){
      cb(err, null); 
    }else{
      response.body = JSON.stringify({
        statusMessage: 'success',
        data,
      });

      cb(null, response);
    }

  });
}





/*
  - function: save who waker is from, who it's to and the waker file
  - param: file, fb user_id for to/from, name of to/from
  - return filename, and who it's from
*/
module.exports.postWakers = (e, context, cb) => {
  const input = JSON.parse(e.body);

  input.created_at = moment().format(CREATED_FORMAT);

  /* save new waker item */
  const newItem = {
    Item: input,
    TableName: TABLE
  }; 

  // save who waker is from and who it's to and the file path to s3
  DB.put(newItem, (err, data) => {

    if( err ){
      cb(err, null);
    }else{
      response.body = JSON.stringify({
        statusMessage: 'success',
        data,
      });

      cb(null, response);
    }

  }); // end of db.put
}





/*
  - function: delete wake up call
  - body: should have in body the wakeupcall filename, so I know which file to delete
  - return: success/failed
*/
module.exports.deleteWakers = (e, context, cb) => {

  const input = JSON.parse(e.body);

  /*
    objects to delete from s3 should look like:
    {
     Key: "HappyFace.jpg",  --> REQUIRED
     VersionId: "2LWg7lQLnY41.maGB5Z6SWW.dcq0vx7b" --> optional
    }
  */
  const deleteFromS3Params = {
    Bucket: S3_BUCKET,
    Delete: {
      Objects: input.wakers
    }
  }; 

  // delete objects from s3 bucket
  S3.deleteObjects(deleteFromS3Params, (err, data) => {

    if(err){
      console.log(err, err.stack); // an error occurred
      cb(err, null);

    }else{
      // once deleted from s3, delete from db next
      deleteWakersFromDB({wakers: input.wakerObjects, s3response: data, cb});
    }

  });
}


// delete a list wakers from DB
const deleteWakersFromDB = ({ wakers, s3response, cb }) => {

  let i = 1;
  const dbResponses = [];
  const errResponses = [];
  const deleteFromDBParams = {
    TableName: TABLE,
    Key: {} 
  };

  wakers.forEach(waker => {

    // update Key to this waker object which contains 1 prop (waker_id) w/ value of an id
    deleteFromDBParams.Key = waker;

    DB.delete(deleteFromDBParams, (err, data) => {

      if( i === wakers.length ){
        response.body = JSON.stringify({
          statusMessage: 'success',
          s3response,
          dbResponses,
          errResponses,
        });

        cb(null, response);

      }else{

        // if err thrown, add to err list
        if( err ) errResponses.push( err );
        else dbResponses.push( data );

        i++; // increment i if not last delete request
      }

    }); // end of delete

  }); // end of foreach

}







