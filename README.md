# mysql-db-dump-portal
Self service portal to dump managed mysql databases

Supported clouds:
- AWS

## Requirements

Required db permissions:
```mysql
create USER 'db_dump'@'%' IDENTIFIED WITH mysql_native_password BY 'i2HdS6dM1yt4QJ';
GRANT SELECT, LOCK TABLES, SHOW DATABASES, SHOW VIEW, EVENT, TRIGGER ON *.* TO 'db_dump'@'%';
```

Required AWS permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": ["arn:aws:s3:::BUCKETNAME"]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject"
      ],
      "Resource": ["arn:aws:s3:::BUCKETNAME/*"]
    }
  ]
}
```

## Linting
```bash
npm run lint
```

## Running locally:

```bash 
aws-vault exec AWS_PROFILE
export CLOUD=AWS
export AWS_BUCKET=<bucketname>
export DB_USER=<db_dump>
export DB_PASS=<password>
nodemon
```

Then browse to http://localhost:8080/

## Deployment

TODO:
- create docker file
- create helm chart
- add example s3 bucket policy, iam role, 

