'use strict';

// libs
const AWS = require('aws-sdk');
const moment = require('moment');

// constants
const DB = new AWS.DynamoDB.DocumentClient({region: 'us-west-1'});
const TABLE = process.env.DB_TABLE_NAME;

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
  - function: finds user row from DynamoDB
  - return: user data or null
*/
module.exports.getAllFriends = (e, context, callback) => {
  const input = e.queryStringParameters;

  // if input is empty, return error
  if( !input ) callback(error, null);

  let attr = 'fb_user_id';

  if( input.type === 'outstanding' ) attr = 'friend_fb_user_id';

  const params = {
    TableName: TABLE,
    Limit: 50,
    FilterExpression: `${attr} = :val`,
    ExpressionAttributeValues: {
        ":val": input.value
    },
  }

  DB.scan(params, (err, data) => {

    if( err ){
      console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
      callback(err, null); 
    }else{
      response.body = JSON.stringify({
        statusMessage: 'success',
        data,
      });

      callback(null, response);
    }

  });
}




/*
  - function: creates new user in table
  - return: success / fail 
*/
module.exports.createOrUpdate = (e, context, callback) => {

  const input = JSON.parse(e.body);

  // set last_updated time to now
  input.last_updated = moment().format('YYYY-DD-MM_HH:MM:SS');

  const newItem = {
    Item: input,
    TableName: TABLE
  }; 

  // write to db
  DB.put(newItem, (err, data) => {

    if( err ){
      callback(err, null);
    }else{
      response.body = JSON.stringify({
        statusMessage: 'success',
        test: 'saved user info',
        data,
      });

      callback(null, response);
    }

  }); 
}