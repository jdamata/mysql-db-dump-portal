var CronJob = require('cron').CronJob;
var AWS = require('aws-sdk');
var fs = require('fs');
var mysql = require('mysql');

// Fetch DB Env vars
var db_user = process.env.DB_USER;
var db_pass = process.env.DB_PASS;

// Setup AWS creds
AWS.config.getCredentials(function (err) {
  if (err) {
    console.error(err.stack);
  }
});

// Create a cronjob that updates .mysql-dump.json with a json object
// Runs every hour
var rdscron = new CronJob('10 * * * *', rds_cron());

async function rds_cron() {
  try {
    rds_db_json = await construct_rds_db_object();
  } catch (err) {
    console.error(`Failed to construct rds database json map: ${err}`);
  }
  fs.writeFile('.mysql-dump.json', JSON.stringify(rds_db_json), function (err) {
    if (err) {
      console.error(`Failed to write rds database json map to file: ${err}`);
    } else {
      console.debug('Updated RDS Database json object');
    }
  });
}

// Returns a list of rds instances
async function get_rds_list() {
  rds = new AWS.RDS();
  rds_list = [];
  return new Promise(function (resolve) {
    // Grab list of RDS instances
    rds.describeDBInstances({}, function (err, data) {
      if (err) {
        console.error(`Failed to get list of RDS instances: ${err}`);
      } else {
        // Filter for mysql instances
        for (var i = 0; i < data.DBInstances.length; i++) {
          if (
            data.DBInstances[i].Engine === 'mysql' &&
            typeof data.DBInstances[i].Endpoint !== 'undefined'
          ) {
            rds_list.push(data.DBInstances[i].Endpoint.Address);
          }
        }
      }
      console.debug(`List of RDS instances found: ${rds_list}`);
      resolve(rds_list);
    });
  });
}

// Returns a list of dbs from an RDS instance
async function get_db_list(rds_instance) {
  db_list = [];
  con = mysql.createConnection({
    host: rds_instance,
    user: db_user,
    password: db_pass,
    connectTimeout: 10000,
    ssl: 'Amazon RDS',
  });
  return new Promise(function (resolve, reject) {
    // Grab list of databases
    con.connect(function (err) {
      if (err) {
        reject(`Cannot connect to RDS instance: ${err}`);
      } else {
        con.query('SHOW DATABASES;', function (err, result) {
          if (err) {
            reject(`Failed to fetch list of databases: ${err}`);
          } else {
            for (var i = 0; i < result.length; i++) {
              db_list.push(result[i].Database);
            }
            console.debug(
              `List of dbs in rds instance ${rds_instance} found: ${db_list}`
            );
            resolve(db_list);
          }
        });
      }
    });
  });
}

// Returns a json object containing a map of RDS instance and mysql dbs
async function construct_rds_db_object() {
  rds_db_object = {};
  return new Promise(async function (resolve) {
    try {
      rds_list = await get_rds_list();
    } catch (err) {
      console.error(
        `Failed to write rds database json map to file. Error: ${err}`
      );
      return;
    }
    for (i = 0; i < rds_list.length; i++) {
      try {
        dbs = await get_db_list(rds_list[i]);
        rds_db_object[rds_list[i]] = dbs;
      } catch (err) {
        console.warn(
          `Failed to grab list of databases from RDS instance: ${rds_list[i]}. Error: ${err}`
        );
      }
    }
    console.log(`Mapping of rds -> db: ${JSON.stringify(rds_db_object)}`);
    resolve(JSON.stringify(rds_db_object));
  });
}

module.exports = rdscron;
