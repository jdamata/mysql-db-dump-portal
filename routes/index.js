var AWS = require('aws-sdk');
var express = require('express');
var fs = require('fs');
var mysqldump = require('mysqldump');
var router = express.Router();
var moment = require('moment');
var today = moment.utc();

/* GET list of db dump. */
router.get('/', async function (req, res, next) {
  s3 = new AWS.S3({apiVersion: '2006-03-01'});
  var params = { 
    Bucket: process.env.AWS_BUCKET
  }
  s3.listObjects(params, function (err, data) {
    if(err) {
      console.error("Failed getting list of s3 objects: ", err)
    }
    res.render('index', {
      object_list: JSON.stringify(data),
    });
  });
});

/* GET list of dumps. */
router.get('/dump', async function (req, res, next) {
  // read local file containing map of db instance to database
  fs.readFile('.mysql-dump.json', 'utf8', (err, jsonString) => {
    if (err) {
      console.error('Failed to read .mysql-dump.json file :', err);
    }
    res.render('dump', {
      db_json: JSON.parse(jsonString),
    });
  });
});

/* POST dump page. */
router.post('/dump', async function (req, res, next) {
  if (req.body.instance == '' || req.body.db == '') {
    console.error('Missing instance or db in form data');
    return;
  }
  const prefix = `${req.body.instance}-${req.body.db}-`;
  const filename = prefix + today.format('HH-mm-ss') + '.sql';
  // Run mysqldump
  mysqldump({
    connection: {
      host: req.body.instance,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: req.body.db,
    },
    dumpToFile: filename,
  });
  // Upload dump to S3
  var fileStream = fs.createReadStream(filename);
  fileStream.on('error', function (err) {
    console.log('Error loading db dump file: ', err);
  });
  s3 = new AWS.S3({apiVersion: '2006-03-01'});
  uploadParams = {
    Bucket: process.env.AWS_BUCKET,
    Key: `${today.format('YYYY')}/${today.format('MM')}/${today.format(
      'DD'
    )}/${filename}`,
    Body: fileStream,
  };
  s3.upload(uploadParams, function (err, data) {
    if (err) {
      console.log('Error uploading dump to s3: ', err);
    }
    if (data) {
      console.log('Succesfully uploaded dump to s3: ', data.Location);
    }
  });
  // Delete local dump
  fs.unlink(filename, (err) => {
    if (err) {
      console.error('Failed to delete local db dump file: ', err);
      res.redirect('/');
    } else {
      console.log('Cleaned up local db dump file');
      res.redirect('/');
    }
  });
});

module.exports = router;
