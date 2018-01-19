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
module.exports.read = (e, context, callback) => {
  const input = e.queryStringParameters;

  // if input is empty, return error
  if( !input ) callback(error, null);

  const params = {
    TableName: TABLE,
    Key: {
      "fb_user_id": input.fb_user_id
    }
  } 

  DB.get(params, (err, data) => {

    if( err ){
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




/*
  - function: queries users based off a search key
  - return: user data or null
*/
module.exports.search = (e, context, callback) => {

  const input = e.queryStringParameters;

  const params = {
    TableName: TABLE,
    Limit: 50,
    KeyConditionExpression: "#name = :name",
    ExpressionAttributeNames:{
        "#name": "name"
    },
    ExpressionAttributeValues: {
        ":name": input.searched
    },
    FilterExpression: "contains(#name, :name)"
  }

  DB.scan(params, (err, data) => {

    if( err ){
      callback(err, null);
    }else{
      // filter out the user that made the search request
      data.Items = data.Items.filter(item => item.fb_user_id != input.fb_user_id);

      const response = {
        statusCode: 200,
        body: JSON.stringify({
          statusMessage: 'success',
          data,
        })
      };

      callback(null, response);
    }

  }); 

}
